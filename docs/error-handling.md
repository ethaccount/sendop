
```ts
import type { Addressable, FetchRequest, JsonRpcApiProviderOptions, Networkish, PerformActionRequest, JsonRpcPayload, JsonRpcError } from 'ethers'
import { getBigInt, hexlify, JsonRpcProvider, resolveAddress, makeError, Network } from 'ethers'
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
] as const

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

// Account Abstraction error codes mapping
const AA_ERROR_CODES: Record<string, { code: string; description: string }> = {
	'AA10': { code: 'VALIDATION_FAILED', description: 'Sender already constructed' },
	'AA13': { code: 'VALIDATION_FAILED', description: 'initCode failed or OOG' },
	'AA14': { code: 'VALIDATION_FAILED', description: 'initCode must return sender' },
	'AA15': { code: 'VALIDATION_FAILED', description: 'initCode must create sender' },
	'AA21': { code: 'VALIDATION_FAILED', description: 'didn\'t pay prefund' },
	'AA22': { code: 'VALIDATION_FAILED', description: 'expired or not due' },
	'AA23': { code: 'VALIDATION_FAILED', description: 'reverted (or OOG)' },
	'AA24': { code: 'VALIDATION_FAILED', description: 'signature error' },
	'AA25': { code: 'VALIDATION_FAILED', description: 'invalid account nonce' },
	'AA31': { code: 'PAYMASTER_VALIDATION_FAILED', description: 'paymaster deposit too low' },
	'AA32': { code: 'PAYMASTER_VALIDATION_FAILED', description: 'paymaster expired or not due' },
	'AA33': { code: 'PAYMASTER_VALIDATION_FAILED', description: 'reverted (or OOG) in validation function' },
	'AA34': { code: 'PAYMASTER_VALIDATION_FAILED', description: 'signature error' },
	'AA40': { code: 'VALIDATION_FAILED', description: 'over verificationGasLimit' },
	'AA41': { code: 'VALIDATION_FAILED', description: 'too little verificationGas' },
	'AA50': { code: 'EXECUTION_FAILED', description: 'postOp reverted' },
	'AA51': { code: 'EXECUTION_FAILED', description: 'prefund too low' },
	'AA90': { code: 'UNSUPPORTED_AGGREGATOR', description: 'invalid aggregator' },
	'AA91': { code: 'UNSUPPORTED_AGGREGATOR', description: 'failed to validate aggregator' },
	'AA92': { code: 'UNSUPPORTED_AGGREGATOR', description: 'invalid aggregator signature' },
	'AA93': { code: 'UNSUPPORTED_AGGREGATOR', description: 'invalid aggregator signature length' },
	'AA94': { code: 'UNSUPPORTED_AGGREGATOR', description: 'aggregator signature does not match' },
	'AA95': { code: 'EXECUTION_FAILED', description: 'out of gas' },
}

export class ERC4337Bundler extends JsonRpcProvider {
	#ethProvider?: JsonRpcProvider
	#supportsEthMethods: boolean

	constructor(bundlerUrl: string | FetchRequest, network?: Networkish, options?: ERC4337BundlerOptions) {
		// Always use staticNetwork to prevent eth_chainId calls during network detection
		const bundlerOptions: ERC4337BundlerOptions = {
			...options,
			staticNetwork: options?.staticNetwork ?? (network ? Network.from(network) : true)
		}
		
		super(bundlerUrl, network, bundlerOptions)

		this.#supportsEthMethods = options?.supportsEthMethods ?? false

		// Create separate eth provider if URL provided
		if (options?.ethProviderUrl) {
			this.#ethProvider = new JsonRpcProvider(options.ethProviderUrl, network, {
				...options,
				staticNetwork: bundlerOptions.staticNetwork
			})
		}
	}

	override async send(method: string, params: Array<any>): Promise<any> {
		// Always allow ERC-4337 methods on bundler
		if (ERC4337_METHODS.includes(method as any)) {
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
		throw makeError(`Method '${method}' not supported by bundler`, "UNSUPPORTED_OPERATION", {
			operation: method
		})
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

	// Override error handling to properly parse ERC-4337 errors
	override getRpcError(payload: JsonRpcPayload, _error: JsonRpcError): Error {
		const { method } = payload
		const { error } = _error

		// Handle ERC-4337 specific methods
		if (ERC4337_METHODS.includes(method as any) && error?.message) {
			const message = error.message

			// Parse Account Abstraction error codes
			const aaMatch = message.match(/\b(AA\d{2})\b/)
			if (aaMatch) {
				const aaCode = aaMatch[1]
				const aaError = AA_ERROR_CODES[aaCode]
				
				if (aaError) {
					const userOp = payload.params?.[0]
					return makeError(
						`Account Abstraction Error ${aaCode}: ${aaError.description}`,
						aaError.code as any,
						{
							aaCode,
							userOperation: userOp,
							info: { payload, error },
							reason: message
						}
					)
				}
			}

			// Handle FailedOp errors
			if (message.includes('FailedOp') || message.includes('FailedOpWithRevert')) {
				const userOp = payload.params?.[0]
				return makeError(
					`UserOperation failed: ${message}`,
					"CALL_EXCEPTION",
					{
						userOperation: userOp,
						info: { payload, error },
						reason: message
					}
				)
			}

			// Handle bundler-specific errors
			if (method === 'eth_sendUserOperation') {
				if (message.includes('insufficient funds')) {
					return makeError("insufficient funds for UserOperation", "INSUFFICIENT_FUNDS", {
						userOperation: payload.params?.[0],
						info: { payload, error }
					})
				}
				
				if (message.includes('replacement')) {
					return makeError("replacement UserOperation underpriced", "REPLACEMENT_UNDERPRICED", {
						userOperation: payload.params?.[0],
						info: { payload, error }
					})
				}
			}

			// Generic ERC-4337 error with better context
			return makeError(
				`ERC-4337 ${method} error: ${message}`,
				"CALL_EXCEPTION",
				{
					method,
					userOperation: payload.params?.[0],
					info: { payload, error },
					reason: message
				}
			)
		}

		// Fall back to default error handling
		return super.getRpcError(payload, _error)
	}

	// ================================ ERC-4337 methods ================================

	/**
	 * Send a `UserOperation` to the bundler.
	 * @param userOp a `UserOperation` object
	 * @param entryPointAddress the entry point address
	 * @returns a `userOpHash` value returned by `eth_sendUserOperation`
	 */
	async sendUserOperation(userOp: UserOperation, entryPointAddress: string | Addressable): Promise<string> {
		try {
			return await this.send('eth_sendUserOperation', [toUserOpHex(userOp), await resolveAddress(entryPointAddress)])
		} catch (error: any) {
			// Add context to the error
			if (error.userOperation) {
				error.userOperation = userOp
			}
			throw error
		}
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
		try {
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
		} catch (error: any) {
			// Add context to the error
			if (error.userOperation) {
				error.userOperation = userOp
			}
			throw error
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
		const normalizedHash = hexlify(hash)

		let receipt: UserOperationReceipt | null = null
		while (!receipt && Date.now() < endtime) {
			try {
				receipt = await this.getUserOperationReceipt(normalizedHash)
			} catch (error) {
				// Ignore errors during polling
				console.warn('Error polling for receipt:', error)
			}
			
			if (!receipt) {
				await new Promise(resolve => setTimeout(resolve, interval))
			}
		}

		if (!receipt) {
			throw makeError(
				`Timeout waiting for UserOperation receipt`,
				"TIMEOUT",
				{
					hash: normalizedHash,
					timeout
				}
			)
		}

		return receipt
	}

	/**
	 * Validate UserOperation before sending
	 */
	validateUserOperation(userOp: UserOperation): void {
		if (!userOp.sender) {
			throw makeError("UserOperation missing sender", "INVALID_ARGUMENT", {
				argument: "userOp.sender",
				value: userOp.sender
			})
		}
		
		if (!userOp.callData) {
			throw makeError("UserOperation missing callData", "INVALID_ARGUMENT", {
				argument: "userOp.callData", 
				value: userOp.callData
			})
		}

		// Add more validation as needed
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
```