import type { Addressable, JsonRpcApiProviderOptions, Networkish, PerformActionRequest, FetchRequest } from 'ethers'
import { getBigInt, isAddress, JsonRpcProvider, resolveAddress, toQuantity, ZeroAddress } from 'ethers'
import type {
	EstimateUserOperationGasResponse,
	EstimateUserOperationGasResponseHex,
	GetUserOperationByHashResponse,
	UserOperation,
	UserOperationHex,
	UserOperationReceipt,
	UserOperationReceiptHex,
} from './UserOperation'

export interface ERC4337Bundler {
	sendUserOperation(userOp: UserOperation, entryPointAddress: string | Addressable): Promise<string>
	estimateUserOperationGas(
		userOp: UserOperation,
		entryPointAddress: string | Addressable,
	): Promise<EstimateUserOperationGasResponse>
	getUserOperationByHash(hash: string): Promise<GetUserOperationByHashResponse>
	getUserOperationReceipt(hash: string): Promise<UserOperationReceipt | null>
	supportedEntryPoints(): Promise<string[]>
	chainId(): Promise<bigint>
}

// Refer to ERC-7769: JSON-RPC API for ERC-4337: https://eips.ethereum.org/EIPS/eip-7769
export const ERC4337_METHODS = [
	'eth_sendUserOperation',
	'eth_estimateUserOperationGas',
	'eth_getUserOperationByHash',
	'eth_getUserOperationReceipt',
	'eth_supportedEntryPoints',
	'eth_chainId',
]

export interface ERC4337BundlerOptions extends JsonRpcApiProviderOptions {
	/**
	 * Enable standard eth_ methods on the bundler endpoint
	 * @default false
	 */
	supportsEthMethods?: boolean

	/**
	 * Separate provider URL for standard eth_ methods
	 * If provided, eth methods will be routed to this URL
	 */
	ethProviderUrl?: string | FetchRequest
}

export class ERC4337Bundler extends JsonRpcProvider {
	#ethProvider?: JsonRpcProvider
	#supportsEthMethods: boolean

	constructor(bundlerUrl: string | FetchRequest, network?: Networkish, options?: ERC4337BundlerOptions) {
		super(bundlerUrl, network, options)

		this.#supportsEthMethods = options?.supportsEthMethods ?? false

		// Create separate eth provider if URL provided
		if (options?.ethProviderUrl) {
			this.#ethProvider = new JsonRpcProvider(options.ethProviderUrl, network, options)
		}
	}

	override async send(method: string, params: Array<any>): Promise<any> {
		// Always allow ERC-4337 methods on bundler
		if (ERC4337_METHODS.includes(method)) {
			return await super.send(method, params)
		}

		// Route to separate eth provider if available
		if (this.#ethProvider) {
			return await this.#ethProvider.send(method, params)
		}

		// Use bundler endpoint if eth methods enabled
		if (this.#supportsEthMethods) {
			return await super.send(method, params)
		}

		// Unknown method
		throw new Error(`Method '${method}' not supported.`)
	}

	override getRpcRequest(req: PerformActionRequest): null | { method: string; args: Array<any> } {
		// Only handle eth methods if enabled or eth provider available
		if (this.#supportsEthMethods || this.#ethProvider) {
			return super.getRpcRequest(req)
		}

		// Otherwise force direct method calls via send()
		return null
	}

	override async _perform(req: PerformActionRequest): Promise<any> {
		// Route to eth provider if available and it's a standard operation
		if (this.#ethProvider && !ERC4337_METHODS.some(method => super.getRpcRequest(req)?.method === method)) {
			return await this.#ethProvider._perform(req)
		}

		return await super._perform(req)
	}

	// ================================ ERC-4337 convenience methods ================================

	/**
	 * Send a `UserOperation` to the bundler.
	 * @param userOp a `UserOperation` object
	 * @param entryPointAddress the entry point address
	 * @returns a `userOpHash` value returned by `eth_sendUserOperation`
	 */
	async sendUserOperation(userOp: UserOperation, entryPointAddress: string | Addressable): Promise<string> {
		return await this.send('eth_sendUserOperation', [toUserOpHex(userOp), await resolveAddress(entryPointAddress)])
	}

	/**
	 * Estimate the gas cost of a `UserOperation` before sending it to the bundler.
	 * @param userOp
	 * @param entryPointAddress
	 * @returns EstimateUserOperationGasResponse
	 */
	async estimateUserOperationGas(
		userOp: UserOperation,
		entryPointAddress: string | Addressable,
	): Promise<EstimateUserOperationGasResponse> {
		const estimation: EstimateUserOperationGasResponseHex = await this.send('eth_estimateUserOperationGas', [
			toUserOpHex(userOp),
			await resolveAddress(entryPointAddress),
		])
		return {
			preVerificationGas: getBigInt(estimation.preVerificationGas),
			verificationGasLimit: getBigInt(estimation.verificationGasLimit),
			callGasLimit: getBigInt(estimation.callGasLimit),
			paymasterVerificationGasLimit: estimation.paymasterVerificationGasLimit
				? getBigInt(estimation.paymasterVerificationGasLimit)
				: undefined,
		}
	}

	/**
	 * Return a `UserOperation` object based on a `userOpHash` value returned by `eth_sendUserOperation`.
	 * @param hash a `userOpHash` value returned by `eth_sendUserOperation`
	 * @returns GetUserOperationByHashResponse
	 */
	async getUserOperationByHash(hash: string): Promise<GetUserOperationByHashResponse> {
		return await this.send('eth_getUserOperationByHash', [hash])
	}

	/**
	 * Return a `UserOperationReceipt` object based on a `userOpHash` value returned by `eth_sendUserOperation`.
	 * @param hash a `userOpHash` value returned by `eth_sendUserOperation`
	 * @returns Returns `null` in case the `UserOperation` is not yet included in a block
	 */
	async getUserOperationReceipt(hash: string): Promise<UserOperationReceipt | null> {
		const result = (await this.send('eth_getUserOperationReceipt', [hash])) as UserOperationReceiptHex | null
		if (!result) {
			return null
		}
		return fromUserOpReceiptHex(result)
	}

	async supportedEntryPoints(): Promise<string[]> {
		return await this.send('eth_supportedEntryPoints', [])
	}

	async chainId(): Promise<bigint> {
		return getBigInt(await this.send('eth_chainId', []))
	}

	// Get the underlying eth provider if available
	get ethProvider(): JsonRpcProvider | undefined {
		return this.#ethProvider
	}

	override destroy(): void {
		if (this.#ethProvider) {
			this.#ethProvider.destroy()
		}
		super.destroy()
	}
}

export function toUserOpHex(userOp: UserOperation): UserOperationHex {
	if (userOp.factory) {
		if (!isAddress(userOp.factory) || userOp.factory === ZeroAddress) {
			throw new Error('[toUserOpHex] Invalid factory address')
		}

		if (!userOp.factoryData || userOp.factoryData === '0x') {
			throw new Error('[toUserOpHex] Invalid factory data')
		}
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

		factory: userOp.factory,
		factoryData: userOp.factoryData,

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
			status: getBigInt(receiptHex.receipt.status),
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
