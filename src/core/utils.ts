import type { BigNumberish } from 'ethers'
import { AbiCoder, getBigInt, getBytes, keccak256, TypedDataEncoder, ZeroAddress, type TypedDataDomain } from 'ethers'
import type { UserOperation } from './UserOperation'
import { ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS, INITCODE_EIP7702_MARKER } from '@/constants'
import { packUserOp } from './conversion-utils'
import type { TypedDataTypes } from './types'

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

export function isEip7702UserOp(op: UserOperation): boolean {
	return op.factory?.startsWith(INITCODE_EIP7702_MARKER) ?? false
}

export function getUserOpHashWithEip7702(op: UserOperation, chainId: number, delegateAddress: string): Uint8Array {
	if (!isEip7702UserOp(op)) {
		throw new Error(`[getUserOpHashWithEip7702] factory should start with ${INITCODE_EIP7702_MARKER}`)
	}

	return getUserOpHashV08(
		// Note that we create a new userOp with the delegate address instead of modifying the original userOp
		{
			...op,
			factory: delegateAddress,
		},
		chainId,
	)
}

export function getUserOpHashV08(userOp: UserOperation, chainId: BigNumberish): Uint8Array {
	const packedUserOp = packUserOp(userOp)
	const { domain, types } = getV08DomainAndTypes(chainId)
	return getBytes(TypedDataEncoder.hash(domain, types, packedUserOp))
}

export function getV08DomainAndTypes(chainId: BigNumberish): {
	domain: TypedDataDomain
	types: TypedDataTypes
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
