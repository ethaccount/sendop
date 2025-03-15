import ADDRESS from '@/addresses'
import type { Bundler, UserOp, UserOpReceipt } from '@/core'
import { normalizeError, SendopError } from '@/error'
import { RpcProvider } from '@/RpcProvider'
import { encodeHandleOpsCalldata, parseContractError, randomAddress } from '@/utils'

export type GasValues = {
	maxFeePerGas: string
	maxPriorityFeePerGas: string
	preVerificationGas: string
	verificationGasLimit: string
	callGasLimit: string
}

export type BundlerOptions = {
	skipGasEstimation?: boolean
	onBeforeEstimation?: (userOp: UserOp) => Promise<UserOp>
	onGetGasValues?: (gasValues: GasValues) => Promise<GasValues>
	onBeforeSendUserOp?: (userOp: UserOp) => Promise<UserOp>
	debugHandleOps?: boolean
	parseError?: boolean
}

export abstract class BaseBundler implements Bundler {
	public chainId: string
	public url: string
	public rpcProvider: RpcProvider
	protected skipGasEstimation: boolean
	protected onGetGasValues?: (gasValues: GasValues) => Promise<GasValues>
	protected onBeforeEstimation?: (userOp: UserOp) => Promise<UserOp>
	protected onBeforeSendUserOp?: (userOp: UserOp) => Promise<UserOp>
	protected debugHandleOps?: boolean
	protected parseError: boolean = false

	constructor(chainId: string, url: string, options?: BundlerOptions) {
		this.chainId = chainId
		this.url = url
		this.rpcProvider = new RpcProvider(url)
		this.skipGasEstimation = options?.skipGasEstimation ?? false
		this.onBeforeEstimation = options?.onBeforeEstimation
		this.onGetGasValues = options?.onGetGasValues
		this.onBeforeSendUserOp = options?.onBeforeSendUserOp
		this.debugHandleOps = options?.debugHandleOps ?? false
		this.parseError = options?.parseError ?? false

		if (this.debugHandleOps) {
			console.warn('debugHandleOps is enabled. It will skip gas estimation.')
			this.skipGasEstimation = true
		}
	}

	abstract getGasValues(userOp: UserOp): Promise<GasValues>

	async sendUserOperation(userOp: UserOp): Promise<string> {
		if (this.onBeforeSendUserOp) {
			userOp = await this.onBeforeSendUserOp(userOp)
		}

		if (this.debugHandleOps) {
			console.log('handleOpsCalldata:')
			console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
		}

		return await this.rpcProvider.send({
			method: 'eth_sendUserOperation',
			params: [userOp, ADDRESS.EntryPointV7],
		})
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

		let estimateGas

		try {
			estimateGas = await this.rpcProvider.send({
				method: 'eth_estimateUserOperationGas',
				params: [userOp, ADDRESS.EntryPointV7],
			})
		} catch (error: unknown) {
			const err = normalizeError(error)
			if (this.parseError) {
				const hexDataMatch = err.message.match(/(0x[a-fA-F0-9]+)(?![0-9a-fA-F])/)
				const hasHexData = hexDataMatch?.[1]

				if (hasHexData) {
					const parsedError = parseContractError(hasHexData)
					if (parsedError) {
						// replace hex data with parsed error
						const newMessage = err.message.replace(hasHexData, parsedError)
						throw new BaseBundlerError(newMessage, { cause: err })
					}
				}
			}
			throw err
		}

		this.validateGasEstimation(estimateGas)
		return estimateGas
	}

	protected getDefaultGasEstimation() {
		return {
			preVerificationGas: '0xf423f', // 999_999
			verificationGasLimit: '0xf423f',
			callGasLimit: '0xf423f',
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
