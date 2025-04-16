import { ADDRESS } from '@/addresses'
import { formatUserOpToHex, type Bundler, type UserOp, type UserOpReceipt } from '@/core'
import { normalizeError, SendopError } from '@/error'
import { RpcProvider } from '@/RpcProvider'
import { encodeHandleOpsCalldata, parseContractError, randomAddress } from '@/utils'
import { type EntryPointVersion } from '@/utils/contract-helper'

export type GasValues = {
	maxFeePerGas: bigint
	maxPriorityFeePerGas: bigint
	preVerificationGas: bigint
	verificationGasLimit: bigint
	callGasLimit: bigint
}

export type BundlerOptions = {
	skipGasEstimation?: boolean
	onBeforeEstimation?: (userOp: UserOp) => Promise<UserOp>
	onAfterEstimation?: (gasValues: GasValues) => Promise<GasValues>
	onBeforeSendUserOp?: (userOp: UserOp) => Promise<UserOp>
	debugSend?: boolean
	debug?: boolean
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
			parseError: options?.parseError ?? false,
			entryPointVersion: options?.entryPointVersion,
		}

		this.rpcProvider = new RpcProvider(this.url)
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
			console.warn('debugSend is enabled. It will skip gas estimation.')
			this._options.skipGasEstimation = true
		}

		if (this._options.debug) {
			console.warn('debug is enabled.')
		}
	}

	abstract _getGasValues(userOp: UserOp): Promise<GasValues>

	async getGasValues(userOp: UserOp): Promise<GasValues> {
		let gasValues = await this._getGasValues(userOp)
		if (this._options.onAfterEstimation) {
			gasValues = await this._options.onAfterEstimation(gasValues)
		}
		return gasValues
	}

	async sendUserOperation(userOp: UserOp): Promise<string> {
		try {
			if (this._options.onBeforeSendUserOp) {
				userOp = await this._options.onBeforeSendUserOp(userOp)
			}

			if (this._options.debugSend) {
				console.log('handleOpsCalldata:')
				console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
				console.log('userOp:')
				console.log(JSON.stringify(formatUserOpToHex(userOp), null, 2))
			}

			return await this.rpcProvider.send({
				method: 'eth_sendUserOperation',
				params: [formatUserOpToHex(userOp), this.entryPointAddress],
			})
		} catch (error: unknown) {
			const err = normalizeError(error)

			if (this._options.debug) {
				console.log('handleOpsCalldata:')
				console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
				console.log('userOp:')
				console.log(JSON.stringify(formatUserOpToHex(userOp), null, 2))
			}

			throw new BaseBundlerError('Failed to send user operation', { cause: err })
		}
	}

	async getUserOperationReceipt(hash: string): Promise<UserOpReceipt> {
		return await this.rpcProvider.send({ method: 'eth_getUserOperationReceipt', params: [hash] })
	}

	protected async estimateUserOperationGas(userOp: UserOp) {
		if (this._options.skipGasEstimation) {
			return this.getDefaultGasEstimation()
		}

		if (this._options.onBeforeEstimation) {
			userOp = await this._options.onBeforeEstimation(userOp)
		}

		const formattedUserOp = formatUserOpToHex(userOp)

		let estimateGas

		try {
			estimateGas = await this.rpcProvider.send({
				method: 'eth_estimateUserOperationGas',
				params: [formattedUserOp, this.entryPointAddress],
			})
		} catch (error: unknown) {
			const err = normalizeError(error)

			if (this._options.debug) {
				userOp.preVerificationGas = 99_999n
				userOp.callGasLimit = 999_999n
				userOp.verificationGasLimit = 999_999n
				userOp.maxFeePerGas = 999_999n
				userOp.maxPriorityFeePerGas = 999_999n

				console.log('handleOpsCalldata:')
				console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
				console.log('userOp:')
				console.log(JSON.stringify(formatUserOpToHex(userOp), null, 2))
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

			throw new BaseBundlerError('Failed to estimate gas', { cause: err })
		}

		this.validateGasEstimation(estimateGas)
		return estimateGas
	}

	protected getDefaultGasEstimation() {
		return {
			preVerificationGas: 999_999,
			verificationGasLimit: 999_999,
			callGasLimit: 999_999,
		}
	}

	protected validateGasEstimation(estimateGas: any) {
		if (!estimateGas) {
			throw new BaseBundlerError('Empty response from gas estimation')
		}

		const requiredFields = ['preVerificationGas', 'verificationGasLimit', 'callGasLimit']
		for (const field of requiredFields) {
			if (!(field in estimateGas)) {
				throw new BaseBundlerError(`Missing required gas estimation field: ${field}`)
			}
		}
		return estimateGas
	}
}

export class BaseBundlerError extends SendopError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'BaseBundlerError'
	}
}
