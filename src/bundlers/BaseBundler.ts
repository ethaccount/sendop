import { ADDRESS } from '@/addresses'
import { type Bundler, type UserOp, type UserOpReceipt } from '@/core'
import { normalizeError, SendopError } from '@/error'
import { RpcProvider } from '@/RpcProvider'
import { encodeHandleOpsCalldata, parseContractError, randomAddress } from '@/utils'
import { toBeHex } from 'ethers'

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
	debugSend?: boolean
	debug?: boolean
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
		if (this.onBeforeSendUserOp) {
			userOp = await this.onBeforeSendUserOp(userOp)
		}

		if (this.debugSend) {
			console.log('handleOpsCalldata:')
			console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
			console.log('userOp:')
			console.log(JSON.stringify(userOp, null, 2))
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

			if (this.debug) {
				userOp.preVerificationGas = toBeHex(BigInt(99_999))
				userOp.callGasLimit = toBeHex(BigInt(999_999))
				userOp.verificationGasLimit = toBeHex(BigInt(999_999))
				userOp.maxFeePerGas = toBeHex(BigInt(999_999))
				userOp.maxPriorityFeePerGas = toBeHex(BigInt(999_999))

				console.log('handleOpsCalldata:')
				console.log(encodeHandleOpsCalldata([userOp], randomAddress()))
				console.log('userOp:')
				console.log(JSON.stringify(userOp, null, 2))
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
