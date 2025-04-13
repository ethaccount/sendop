import type { UserOp } from '@/core'
import { SendopError } from '@/error'
import { BaseBundler, type BundlerOptions, type GasValues } from './BaseBundler'

export class SkandhaBundler extends BaseBundler {
	constructor(chainId: string, url: string, options?: BundlerOptions) {
		super(chainId, url, options)
	}

	async getGasValues(userOp: UserOp): Promise<GasValues> {
		// Get all gas values from estimateUserOperationGas
		const estimateGas = await this.estimateUserOperationGas(userOp)

		// TODO: better way to handle the response
		console.log('estimateGas', estimateGas)

		let gasValues: GasValues = {
			maxFeePerGas: BigInt(estimateGas.maxFeePerGas),
			maxPriorityFeePerGas: BigInt(estimateGas.maxPriorityFeePerGas),
			preVerificationGas: BigInt(estimateGas.preVerificationGas),
			verificationGasLimit: BigInt(estimateGas.verificationGasLimit),
			callGasLimit: BigInt(estimateGas.callGasLimit),
		}

		if (this.onGetGasValues) {
			gasValues = await this.onGetGasValues(gasValues)
		}

		return gasValues
	}
}

export class SkandhaBundlerError extends SendopError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'SkandhaBundlerError'
	}
}
