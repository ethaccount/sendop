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
	onGetGasValues?: (gasValues: GasValues) => Promise<GasValues>
	onBeforeSendUserOp?: (userOp: UserOp) => Promise<UserOp>
	debugSend?: boolean
	debug?: boolean
	parseError?: boolean
	entryPointVersion?: EntryPointVersion
}

export abstract class BaseBundler implements Bundler {
	public chainId: string
	public url: string
	public rpcProvider: RpcProvider
	public entryPointAddress: string

	protected skipGasEstimation: boolean
	protected onGetGasValues?: (gasValues: GasValues) => Promise<GasValues>
	protected onBeforeEstimation?: (userOp: UserOp) => Promise<UserOp>
	protected onBeforeSendUserOp?: (userOp: UserOp) => Promise<UserOp>
	protected debugSend?: boolean
	protected debug?: boolean
	protected parseError: boolean = false

	constructor(chainId: string, url: string, options?: BundlerOptions) {
		this.chainId = chainId
		this.url = url
		this.rpcProvider = new RpcProvider(url)
		this.skipGasEstimation = options?.skipGasEstimation ?? false
		this.onBeforeEstimation = options?.onBeforeEstimation
		this.onGetGasValues = options?.onGetGasValues
		this.onBeforeSendUserOp = options?.onBeforeSendUserOp
		this.debugSend = options?.debugSend ?? false
		this.debug = options?.debug ?? false
		this.parseError = options?.parseError ?? false
		this.entryPointAddress = options?.entryPointVersion === 'v0.8' ? ADDRESS.EntryPointV08 : ADDRESS.EntryPointV07

		if (this.debugSend) {
			console.warn('debugSend is enabled. It will skip gas estimation.')
			this.skipGasEstimation = true
		}

		if (this.debug) {
			console.warn('debug is enabled.')
		}
	}

	abstract getGasValues(userOp: UserOp): Promise<GasValues>

	async sendUserOperation(userOp: UserOp): Promise<string> {
		try {
			if (this.onBeforeSendUserOp) {
				userOp = await this.onBeforeSendUserOp(userOp)
			}

			const formattedUserOp = formatUserOpToHex(userOp)

			if (this.debug || this.debugSend) {
				console.log('handleOpsCalldata:')
				console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
				console.log('userOp:')
				console.log(JSON.stringify(formattedUserOp, null, 2))
			}

			return await this.rpcProvider.send({
				method: 'eth_sendUserOperation',
				params: [formattedUserOp, this.entryPointAddress],
			})
		} catch (error: unknown) {
			const err = normalizeError(error)
			throw new BaseBundlerError('Failed to send user operation', { cause: err })
		}
	}

	async getUserOperationReceipt(hash: string): Promise<UserOpReceipt> {
		return await this.rpcProvider.send({ method: 'eth_getUserOperationReceipt', params: [hash] })
	}

	protected async estimateUserOperationGas(userOp: UserOp) {
		if (this.skipGasEstimation) {
			return this.getDefaultGasEstimation()
		}

		if (this.onBeforeEstimation) {
			userOp = await this.onBeforeEstimation(userOp)
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

			if (this.debug) {
				userOp.preVerificationGas = 99_999
				userOp.callGasLimit = 999_999
				userOp.verificationGasLimit = 999_999
				userOp.maxFeePerGas = 999_999
				userOp.maxPriorityFeePerGas = 999_999

				console.log('handleOpsCalldata:')
				console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
				console.log('userOp:')
				console.log(JSON.stringify(formatUserOpToHex(userOp), null, 2))
			}

			if (this.parseError) {
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
