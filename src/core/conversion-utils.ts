import type { BigNumberish } from 'ethers'
import {
	concat,
	dataSlice,
	getAddress,
	getBigInt,
	isAddress,
	toBeHex,
	toQuantity,
	ZeroAddress,
	zeroPadBytes,
	zeroPadValue,
} from 'ethers'
import type {
	PackedUserOperation,
	UserOperation,
	UserOperationHex,
	UserOperationReceipt,
	UserOperationReceiptHex,
} from './UserOperation'
import { INITCODE_EIP7702_MARKER } from './constants'

export function packUserOp(userOp: UserOperation): PackedUserOperation {
	let initCode = '0x'
	if (userOp.factory) {
		const factory = processUserOpFactory(userOp.factory)
		initCode = concat([factory, userOp.factoryData ?? '0x'])
	}

	let paymasterAndData = '0x'
	if (userOp.paymaster) {
		if (!isAddress(userOp.paymaster) || userOp.paymaster === ZeroAddress) {
			throw new Error(`[packUserOp] Invalid paymaster: ${userOp.paymaster}`)
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

export function processUserOpFactory(factory: string): string {
	const isEip7702 = factory.startsWith(INITCODE_EIP7702_MARKER)
	const isValidAddress = isAddress(factory) && factory !== ZeroAddress

	if (!isValidAddress && !isEip7702) {
		throw new Error(`[packUserOp] Invalid factory: ${factory}`)
	}

	// EIP-7702 factories need to be zero-padded to 20 bytes
	return isEip7702 ? zeroPadBytes(factory, 20) : factory
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

export function toUserOpHex(userOp: UserOperation): UserOperationHex {
	// Give default value for factoryData instead of undefined if factory is set

	let factory: string | undefined
	let factoryData: string | undefined
	if (userOp.factory) {
		factory = processUserOpFactory(userOp.factory)
		factoryData = userOp.factoryData ?? '0x'
		// Note that it may have factory without factoryData when using EIP-7702
	}

	// Give default values instead of undefined if paymaster is set
	let paymasterVerificationGasLimit: string | undefined
	let paymasterPostOpGasLimit: string | undefined
	let paymasterData: string | undefined

	if (userOp.paymaster) {
		if (!isAddress(userOp.paymaster) || userOp.paymaster === ZeroAddress) {
			throw new Error('[toUserOpHex] Invalid paymaster address')
		}
		paymasterData = userOp.paymasterData ?? '0x'
		paymasterVerificationGasLimit = toQuantity(userOp.paymasterVerificationGasLimit ?? 0n)
		paymasterPostOpGasLimit = toQuantity(userOp.paymasterPostOpGasLimit ?? 0n)
	}

	return {
		sender: userOp.sender,
		nonce: toQuantity(userOp.nonce),

		factory,
		factoryData,

		callGasLimit: toQuantity(userOp.callGasLimit),
		verificationGasLimit: toQuantity(userOp.verificationGasLimit),
		preVerificationGas: toQuantity(userOp.preVerificationGas),

		maxFeePerGas: toQuantity(userOp.maxFeePerGas),
		maxPriorityFeePerGas: toQuantity(userOp.maxPriorityFeePerGas),

		paymaster: userOp.paymaster,
		paymasterData,
		paymasterVerificationGasLimit,
		paymasterPostOpGasLimit,

		callData: userOp.callData,
		signature: userOp.signature,

		eip7702Auth: userOp.eip7702Auth
			? {
					chainId: toQuantity(userOp.eip7702Auth.chainId),
					address: userOp.eip7702Auth.address,
					nonce: toQuantity(userOp.eip7702Auth.nonce),
					yParity: toQuantity(userOp.eip7702Auth.yParity),
					r: toQuantity(userOp.eip7702Auth.r),
					s: toQuantity(userOp.eip7702Auth.s),
			  }
			: undefined,
	}
}

export function fromUserOpHex(userOpHex: UserOperationHex): UserOperation {
	return {
		sender: userOpHex.sender,
		nonce: getBigInt(userOpHex.nonce),
		factory: userOpHex.factory,
		factoryData: userOpHex.factoryData,
		callData: userOpHex.callData,
		callGasLimit: getBigInt(userOpHex.callGasLimit),
		verificationGasLimit: getBigInt(userOpHex.verificationGasLimit),
		preVerificationGas: getBigInt(userOpHex.preVerificationGas),
		maxFeePerGas: getBigInt(userOpHex.maxFeePerGas),
		maxPriorityFeePerGas: getBigInt(userOpHex.maxPriorityFeePerGas),
		paymaster: userOpHex.paymaster,
		paymasterVerificationGasLimit: userOpHex.paymasterVerificationGasLimit
			? getBigInt(userOpHex.paymasterVerificationGasLimit)
			: undefined,
		paymasterPostOpGasLimit: userOpHex.paymasterPostOpGasLimit
			? getBigInt(userOpHex.paymasterPostOpGasLimit)
			: undefined,
		paymasterData: userOpHex.paymasterData,
		signature: userOpHex.signature,
		eip7702Auth: userOpHex.eip7702Auth
			? {
					chainId: getBigInt(userOpHex.eip7702Auth.chainId),
					address: userOpHex.eip7702Auth.address,
					nonce: getBigInt(userOpHex.eip7702Auth.nonce),
					yParity: getBigInt(userOpHex.eip7702Auth.yParity),
					r: getBigInt(userOpHex.eip7702Auth.r),
					s: getBigInt(userOpHex.eip7702Auth.s),
			  }
			: undefined,
	}
}

export function toUserOpReceiptHex(receipt: UserOperationReceipt): UserOperationReceiptHex {
	return {
		userOpHash: receipt.userOpHash,
		entryPoint: receipt.entryPoint,
		sender: receipt.sender,
		nonce: receipt.nonce,
		paymaster: receipt.paymaster,
		actualGasUsed: toQuantity(receipt.actualGasUsed),
		actualGasCost: toQuantity(receipt.actualGasCost),
		success: receipt.success,
		logs: receipt.logs.map(log => ({
			logIndex: toQuantity(log.logIndex),
			transactionIndex: toQuantity(log.transactionIndex),
			transactionHash: log.transactionHash,
			blockHash: log.blockHash,
			blockNumber: toQuantity(log.blockNumber),
			address: log.address,
			data: log.data,
			topics: log.topics,
		})),
		receipt: {
			transactionHash: receipt.receipt.transactionHash,
			transactionIndex: toQuantity(receipt.receipt.transactionIndex),
			from: receipt.receipt.from,
			to: receipt.receipt.to,
			status: toQuantity(receipt.receipt.status),
			logsBloom: receipt.receipt.logsBloom ?? '',
			blockHash: receipt.receipt.blockHash,
			blockNumber: toQuantity(receipt.receipt.blockNumber),
			contractAddress: receipt.receipt.contractAddress,
			gasUsed: toQuantity(receipt.receipt.gasUsed),
			cumulativeGasUsed: toQuantity(receipt.receipt.cumulativeGasUsed),
			effectiveGasPrice: toQuantity(receipt.receipt.effectiveGasPrice),
			logs: receipt.receipt.logs.map(log => ({
				logIndex: toQuantity(log.logIndex),
				transactionIndex: toQuantity(log.transactionIndex),
				transactionHash: log.transactionHash,
				blockHash: log.blockHash,
				blockNumber: toQuantity(log.blockNumber),
				address: log.address,
				data: log.data,
				topics: log.topics,
			})),
		},
	}
}

export function fromUserOpReceiptHex(receiptHex: UserOperationReceiptHex): UserOperationReceipt {
	return {
		userOpHash: receiptHex.userOpHash,
		entryPoint: receiptHex.entryPoint,
		sender: receiptHex.sender,
		nonce: receiptHex.nonce,
		paymaster: receiptHex.paymaster,
		actualGasUsed: getBigInt(receiptHex.actualGasUsed),
		actualGasCost: getBigInt(receiptHex.actualGasCost),
		success: receiptHex.success,
		logs: receiptHex.logs.map(log => ({
			logIndex: getBigInt(log.logIndex),
			transactionIndex: getBigInt(log.transactionIndex),
			transactionHash: log.transactionHash,
			blockHash: log.blockHash,
			blockNumber: getBigInt(log.blockNumber),
			address: log.address,
			data: log.data,
			topics: log.topics,
		})),
		receipt: {
			transactionHash: receiptHex.receipt.transactionHash,
			transactionIndex: getBigInt(receiptHex.receipt.transactionIndex),
			from: receiptHex.receipt.from,
			to: receiptHex.receipt.to,
			status: getBigInt(normalizeReceiptStatus(receiptHex.receipt.status)),
			logsBloom: receiptHex.receipt.logsBloom,
			blockHash: receiptHex.receipt.blockHash,
			blockNumber: getBigInt(receiptHex.receipt.blockNumber),
			contractAddress: receiptHex.receipt.contractAddress,
			gasUsed: getBigInt(receiptHex.receipt.gasUsed),
			cumulativeGasUsed: getBigInt(receiptHex.receipt.cumulativeGasUsed),
			effectiveGasPrice: getBigInt(receiptHex.receipt.effectiveGasPrice),
			logs: receiptHex.receipt.logs.map(log => ({
				logIndex: getBigInt(log.logIndex),
				transactionIndex: getBigInt(log.transactionIndex),
				transactionHash: log.transactionHash,
				blockHash: log.blockHash,
				blockNumber: getBigInt(log.blockNumber),
				address: log.address,
				data: log.data,
				topics: log.topics,
			})),
		},
	}
}

/**
 * Handle etherspot's quirky receipt status format
 * Etherspot returns "success" instead of "0x1" which may cause error when using getBigInt
 * @docs https://eips.ethereum.org/EIPS/eip-1474
 */
function normalizeReceiptStatus(status: string | number): string {
	// Handle etherspot's string format
	if (typeof status === 'string') {
		if (status.toLowerCase() === 'success') {
			return '0x1'
		}
		if (status.toLowerCase() === 'failure' || status.toLowerCase() === 'failed') {
			return '0x0'
		}
	}

	// If it's already a proper hex string or number, return as-is
	return String(status)
}
