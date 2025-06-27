import type { BigNumberish } from 'ethers'
import {
	AbiCoder,
	concat,
	dataLength,
	dataSlice,
	getAddress,
	getBigInt,
	getBytes,
	isAddress,
	keccak256,
	toBeHex,
	TypedDataEncoder,
	ZeroAddress,
	zeroPadBytes,
	zeroPadValue,
	type TypedDataDomain,
	type TypedDataField,
} from 'ethers'
import type { PackedUserOperation, UserOperation } from './UserOperation'
import { ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS } from './constants'

export function packUserOp(userOp: UserOperation): PackedUserOperation {
	let initCode = '0x'
	if (userOp.factory) {
		if (!isAddress(userOp.factory) || userOp.factory === ZeroAddress) {
			throw new Error('[packUserOp] Invalid factory address')
		}

		initCode = concat([userOp.factory, userOp.factoryData ?? '0x'])

		// Note that it may have factory without factoryData when using EIP-7702
	}

	let paymasterAndData = '0x'
	if (userOp.paymaster) {
		if (!isAddress(userOp.paymaster) || userOp.paymaster === ZeroAddress) {
			throw new Error('[packUserOp] Invalid paymaster address')
		}

		let paymasterVerificationGasLimit = userOp.paymasterVerificationGasLimit ?? 0n
		let paymasterPostOpGasLimit = userOp.paymasterPostOpGasLimit ?? 0n
		let paymasterData = userOp.paymasterData ?? '0x'

		paymasterAndData = concat([
			userOp.paymaster,
			// Don't replace toBeHex with toQuantity here, because zeroPadValue only accepts BytesLike (0x01) instead of quantity (0x1)
			zeroPadValue(toBeHex(paymasterVerificationGasLimit), 16),
			zeroPadValue(toBeHex(paymasterPostOpGasLimit), 16),
			paymasterData,
		])
	}

	return {
		sender: userOp.sender,
		nonce: getBigInt(userOp.nonce),
		initCode,
		callData: userOp.callData,
		accountGasLimits: packValues(userOp.verificationGasLimit, userOp.callGasLimit),
		preVerificationGas: getBigInt(userOp.preVerificationGas),
		gasFees: packValues(userOp.maxPriorityFeePerGas, userOp.maxFeePerGas),
		paymasterAndData,
		signature: userOp.signature,
	}
}

export function unpackUserOp(packedUserOp: PackedUserOperation): UserOperation {
	// Unpack initCode
	let factory: string | undefined
	let factoryData: string = '0x'
	if (packedUserOp.initCode !== '0x' && packedUserOp.initCode.length > 2) {
		factory = getAddress(dataSlice(packedUserOp.initCode, 0, 20))
		factoryData = dataSlice(packedUserOp.initCode, 20)
	}

	// Unpack accountGasLimits
	const { value1: verificationGasLimit, value2: callGasLimit } = unpackValues(packedUserOp.accountGasLimits)

	// Unpack gasFees
	const { value1: maxPriorityFeePerGas, value2: maxFeePerGas } = unpackValues(packedUserOp.gasFees)

	// Unpack paymasterAndData
	let paymaster: string | undefined
	let paymasterVerificationGasLimit: bigint | undefined
	let paymasterPostOpGasLimit: bigint | undefined
	let paymasterData: string = '0x'

	if (packedUserOp.paymasterAndData !== '0x' && packedUserOp.paymasterAndData.length > 2) {
		paymaster = getAddress(dataSlice(packedUserOp.paymasterAndData, 0, 20))
		paymasterVerificationGasLimit = getBigInt(dataSlice(packedUserOp.paymasterAndData, 20, 36))
		paymasterPostOpGasLimit = getBigInt(dataSlice(packedUserOp.paymasterAndData, 36, 52))
		paymasterData = dataSlice(packedUserOp.paymasterAndData, 52)
	}

	return {
		sender: packedUserOp.sender,
		nonce: packedUserOp.nonce,
		factory,
		factoryData,
		callData: packedUserOp.callData,
		callGasLimit,
		verificationGasLimit,
		preVerificationGas: packedUserOp.preVerificationGas,
		maxFeePerGas,
		maxPriorityFeePerGas,
		paymaster,
		paymasterVerificationGasLimit,
		paymasterPostOpGasLimit,
		paymasterData,
		signature: packedUserOp.signature,
	}
}

export function packValues(value1: BigNumberish, value2: BigNumberish): string {
	// Don't replace toBeHex with toQuantity here, because zeroPadValue only accepts BytesLike (0x01) instead of quantity (0x1)
	return concat([zeroPadValue(toBeHex(value1), 16), zeroPadValue(toBeHex(value2), 16)])
}

export function unpackValues(hex: string): { value1: bigint; value2: bigint } {
	return {
		value1: getBigInt(parseInt(hex.slice(2, 34), 16)),
		value2: getBigInt(parseInt(hex.slice(34), 16)),
	}
}

export function getEmptyUserOp(): UserOperation {
	return {
		sender: ZeroAddress,
		nonce: 0n,

		maxFeePerGas: 0n,
		maxPriorityFeePerGas: 0n,

		callGasLimit: 0n,
		verificationGasLimit: 0n,
		preVerificationGas: 0n,

		callData: '0x',
		signature: '0x',
	}
}

export function getUserOpHash(userOp: UserOperation, entryPointAddress: string, chainId: BigNumberish): Uint8Array {
	switch (entryPointAddress) {
		case ENTRY_POINT_V07_ADDRESS:
			return getUserOpHashV07(userOp, chainId)
		case ENTRY_POINT_V08_ADDRESS:
			return getUserOpHashV08(userOp, chainId)
		default:
			throw new Error(`Unsupported entry point address: ${entryPointAddress}`)
	}
}

export function getUserOpHashV07(userOp: UserOperation, chainId: BigNumberish): Uint8Array {
	const packedUserOp = packUserOp(userOp)
	const hashedInitCode = keccak256(packedUserOp.initCode)
	const hashedCallData = keccak256(packedUserOp.callData)
	const hashedPaymasterAndData = keccak256(packedUserOp.paymasterAndData)
	const abiCoder = new AbiCoder()
	const encoded = abiCoder.encode(
		['bytes32', 'address', 'uint256'],
		[
			keccak256(
				abiCoder.encode(
					['address', 'uint256', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32', 'bytes32'],
					[
						userOp.sender,
						userOp.nonce,
						hashedInitCode,
						hashedCallData,
						packedUserOp.accountGasLimits,
						packedUserOp.preVerificationGas,
						packedUserOp.gasFees,
						hashedPaymasterAndData,
					],
				),
			),
			ENTRY_POINT_V07_ADDRESS,
			getBigInt(chainId),
		],
	)
	return getBytes(keccak256(encoded))
}

export const EIP7702_PREFIX = '0xef0100'
export const INITCODE_EIP7702_MARKER = '0x7702'

export function isEip7702UserOp(op: UserOperation): boolean {
	return op.factory === zeroPadBytes(INITCODE_EIP7702_MARKER, 20)
}

export function getUserOpHashWithEip7702(op: UserOperation, chainId: number, delegateAddress: string): Uint8Array {
	if (!isEip7702UserOp(op)) {
		throw new Error('initCode should start with INITCODE_EIP7702_MARKER')
	}

	op.factory = delegateAddress

	return getUserOpHashV08(op, chainId)
}

export function getUserOpHashV08(userOp: UserOperation, chainId: BigNumberish): Uint8Array {
	const packedUserOp = packUserOp(userOp)
	const { domain, types } = getV08DomainAndTypes(chainId)
	return getBytes(TypedDataEncoder.hash(domain, types, packedUserOp))
}

export function getV08DomainAndTypes(chainId: BigNumberish): {
	domain: TypedDataDomain
	types: Record<string, Array<TypedDataField>>
} {
	const domain: TypedDataDomain = {
		name: 'ERC4337',
		version: '1',
		chainId: getBigInt(chainId).toString(),
		verifyingContract: ENTRY_POINT_V08_ADDRESS,
	}

	const types = {
		PackedUserOperation: [
			{ name: 'sender', type: 'address' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'initCode', type: 'bytes' },
			{ name: 'callData', type: 'bytes' },
			{ name: 'accountGasLimits', type: 'bytes32' },
			{ name: 'preVerificationGas', type: 'uint256' },
			{ name: 'gasFees', type: 'bytes32' },
			{ name: 'paymasterAndData', type: 'bytes' },
		],
	}

	return { domain, types }
}
