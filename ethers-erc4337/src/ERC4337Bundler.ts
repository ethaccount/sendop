import type { Addressable, FetchRequest, JsonRpcApiProviderOptions, Networkish, PerformActionRequest } from 'ethers'
import { getBigInt, hexlify, JsonRpcProvider, resolveAddress } from 'ethers'
import type {
	EstimateUserOperationGasResponse,
	EstimateUserOperationGasResponseHex,
	GetUserOperationByHashResponse,
	UserOperation,
	UserOperationReceipt,
	UserOperationReceiptHex,
} from './UserOperation'
import { fromUserOpReceiptHex, toUserOpHex } from './conversion-utils'

export interface ERC4337Bundler {
	// ERC4337 methods
	sendUserOperation(userOp: UserOperation, entryPointAddress: string | Addressable): Promise<string>
	estimateUserOperationGas(
		userOp: UserOperation,
		entryPointAddress: string | Addressable,
	): Promise<EstimateUserOperationGasResponse>
	getUserOperationByHash(hash: string): Promise<GetUserOperationByHashResponse>
	getUserOperationReceipt(hash: string): Promise<UserOperationReceipt | null>
	supportedEntryPoints(): Promise<string[]>
	chainId(): Promise<bigint>

	// convenience methods
	waitForReceipt(hash: string): Promise<UserOperationReceipt>
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

	// ================================ ERC-4337 methods ================================

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

	// ================================ convenience methods ================================

	/**
	 * Wait for a `UserOperationReceipt` to be included in a block.
	 * @param hash a `userOpHash` value returned by `eth_sendUserOperation`
	 * @param timeout the timeout in milliseconds, default to 30 seconds
	 * @param interval the interval in milliseconds, default to 1 second
	 * @returns a `UserOperationReceipt` object
	 */
	async waitForReceipt(hash: string, timeout = 30_000, interval = 1_000): Promise<UserOperationReceipt> {
		const endtime = Date.now() + timeout

		let receipt: UserOperationReceipt | null = null
		while (!receipt && Date.now() < endtime) {
			receipt = await this.getUserOperationReceipt(hexlify(hash))
			if (!receipt) {
				await new Promise(resolve => setTimeout(resolve, interval))
			}
		}

		if (!receipt) {
			throw new Error(`[ERC4337Bundler#waitForReceipt] Timeout waiting for user operation ${hash}`)
		}

		return receipt
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
