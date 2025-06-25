import { ADDRESS } from '@/addresses'
import { toUserOpHex, type Bundler, type GasValues, type UserOperation, type UserOperationReceipt } from '@/core'
import { normalizeError, SendopError } from '@/error'
import { RpcProvider } from '@/RpcProvider'
import { encodeHandleOpsCalldata, parseContractError, randomAddress } from '@/utils'
import { type EntryPointVersion } from '@/utils/contract-helper'
import { z } from 'zod'

// Schema for eth_estimateUserOperationGas RPC response. See ERC-7769.
const estimateGasResponseSchema = z.object({
	// Required fields
	preVerificationGas: z.string(), // Hex string
	verificationGasLimit: z.string(), // Hex string
	callGasLimit: z.string(), // Hex string

	// Optional fields
	paymasterVerificationGasLimit: z.string().optional(), // Only returned if UserOperation specifies a Paymaster address
	// bundler may return maxFeePerGas and maxPriorityFeePerGas (ex. Etherspot)
	maxFeePerGas: z.string().optional(),
	maxPriorityFeePerGas: z.string().optional(),
})

export type BundlerOptions = {
	skipGasEstimation?: boolean
	onBeforeEstimation?: (userOp: UserOperation) => Promise<UserOperation>
	onAfterEstimation?: (gasValues: GasValues) => Promise<GasValues>
	onBeforeSendUserOp?: (userOp: UserOperation) => Promise<UserOperation>
	debugSend?: boolean
	debug?: boolean
	debugRpc?: boolean
	parseError?: boolean
	entryPointVersion?: EntryPointVersion
}

export abstract class BaseBundler implements Bundler {
	public chainId: bigint
	public url: string
	protected readonly _options: BundlerOptions
	public rpcProvider: RpcProvider
	public entryPointAddress: string

	constructor(chainId: bigint, url: string, options?: BundlerOptions) {
		this.chainId = chainId
		this.url = url

		this._options = {
			skipGasEstimation: options?.skipGasEstimation ?? false,
			onBeforeEstimation: options?.onBeforeEstimation,
			onAfterEstimation: options?.onAfterEstimation,
			onBeforeSendUserOp: options?.onBeforeSendUserOp,
			debugSend: options?.debugSend ?? false,
			debug: options?.debug ?? false,
			debugRpc: options?.debugRpc ?? false,
			parseError: options?.parseError ?? false,
			entryPointVersion: options?.entryPointVersion,
		}

		this.rpcProvider = new RpcProvider(this.url, {
			debug: this._options.debugRpc,
		})

		switch (this._options.entryPointVersion) {
			case 'v0.8':
				this.entryPointAddress = ADDRESS.EntryPointV08
				break
			case 'v0.7':
				this.entryPointAddress = ADDRESS.EntryPointV07
				break
			default:
				this.entryPointAddress = ADDRESS.EntryPointV07
		}

		if (this._options.debugSend) {
			console.warn('Bundler "debugSend" mode is enabled. It will skip gas estimation')
			this._options.skipGasEstimation = true
		}

		if (this._options.debug) {
			console.warn('Bundler "debug" mode is enabled')
		}

		if (this._options.skipGasEstimation) {
			console.warn(
				'Bundler "skipGasEstimation" mode is enabled. It will skip gas estimation and directly send the user operation with default gas values',
			)
		}
	}

	abstract _getGasValues(userOp: UserOperation): Promise<GasValues>

	async getGasValues(userOp: UserOperation): Promise<GasValues> {
		let gasValues = await this._getGasValues(userOp)
		if (this._options.onAfterEstimation) {
			gasValues = await this._options.onAfterEstimation(gasValues)
		}
		return gasValues
	}

	async sendUserOperation(userOp: UserOperation): Promise<string> {
		try {
			if (this._options.onBeforeSendUserOp) {
				userOp = await this._options.onBeforeSendUserOp(userOp)
			}

			if (this._options.debugSend) {
				console.log('handleOpsCalldata:')
				console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
				console.log('userOp:')
				console.log(JSON.stringify(toUserOpHex(userOp), null, 2))
			}

			return await this.rpcProvider.send({
				method: 'eth_sendUserOperation',
				params: [toUserOpHex(userOp), this.entryPointAddress],
			})
		} catch (error: unknown) {
			const err = normalizeError(error)

			if (this._options.debug) {
				console.log('handleOpsCalldata:')
				console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
				console.log('userOp:')
				console.log(JSON.stringify(toUserOpHex(userOp), null, 2))
			}

			throw new BaseBundlerError('Send user operation failed', { cause: err })
		}
	}

	async getUserOperationReceipt(hash: string): Promise<UserOperationReceipt> {
		return await this.rpcProvider.send({ method: 'eth_getUserOperationReceipt', params: [hash] })
	}

	protected async estimateUserOperationGas(userOp: UserOperation): Promise<GasValues> {
		const hasPaymaster = !!userOp.paymaster

		if (this._options.skipGasEstimation) {
			return this.defaultGasValues(hasPaymaster)
		}

		if (this._options.onBeforeEstimation) {
			userOp = await this._options.onBeforeEstimation(userOp)
		}

		const formattedUserOp = toUserOpHex(userOp)

		let gasValues: GasValues

		try {
			const response = await this.rpcProvider.send({
				method: 'eth_estimateUserOperationGas',
				params: [formattedUserOp, this.entryPointAddress],
			})

			const parsed = estimateGasResponseSchema.safeParse(response)
			if (!parsed.success) {
				throw new BaseBundlerError(`Invalid estimateGas response: ${parsed.error}`)
			}
			const estimateGas = parsed.data

			// Convert hex string values to BigInt
			gasValues = {
				maxFeePerGas: estimateGas.maxFeePerGas ? BigInt(estimateGas.maxFeePerGas) : 0n,
				maxPriorityFeePerGas: estimateGas.maxPriorityFeePerGas ? BigInt(estimateGas.maxPriorityFeePerGas) : 0n,
				preVerificationGas: BigInt(estimateGas.preVerificationGas),
				verificationGasLimit: BigInt(estimateGas.verificationGasLimit),
				callGasLimit: BigInt(estimateGas.callGasLimit),
				paymasterVerificationGasLimit: estimateGas.paymasterVerificationGasLimit
					? BigInt(estimateGas.paymasterVerificationGasLimit)
					: 0n,
			}
		} catch (error: unknown) {
			const err = normalizeError(error)

			if (this._options.debug) {
				const defaultGasValues = this.defaultGasValues(hasPaymaster)
				userOp.maxFeePerGas = defaultGasValues.maxFeePerGas
				userOp.maxPriorityFeePerGas = defaultGasValues.maxPriorityFeePerGas
				userOp.preVerificationGas = defaultGasValues.preVerificationGas
				userOp.verificationGasLimit = defaultGasValues.verificationGasLimit
				userOp.callGasLimit = defaultGasValues.callGasLimit
				userOp.paymasterVerificationGasLimit = defaultGasValues.paymasterVerificationGasLimit

				console.log('handleOpsCalldata:')
				console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
				console.log('userOp:')
				console.log(JSON.stringify(toUserOpHex(userOp), null, 2))
			}

			if (this._options.parseError) {
				const hexDataMatch = err.message.match(/(0x[a-fA-F0-9]+)(?![0-9a-fA-F])/)
				const hasHexData = hexDataMatch?.[1]

				if (hasHexData) {
					const parsedError = parseContractError(hasHexData)
					if (parsedError) {
						// replace hex data with parsed error
						const newMessage = err.message.replace(hasHexData, parsedError)
						throw new BaseBundlerError(newMessage)
					}
				}
			}

			throw new BaseBundlerError('Gas estimation failed', { cause: err })
		}

		return gasValues
	}

	protected defaultGasValues(hasPaymaster: boolean) {
		return {
			maxFeePerGas: 999_999n,
			maxPriorityFeePerGas: 999_999n,
			preVerificationGas: 99_999n,
			verificationGasLimit: 999_999n,
			callGasLimit: 999_999n,
			paymasterVerificationGasLimit: hasPaymaster ? 999_999n : 0n,
		}
	}
}

export class BaseBundlerError extends SendopError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'BaseBundlerError'
	}
}
