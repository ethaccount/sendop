import type { UserOp } from '@/core'
import { SendopError } from '@/error'
import { BaseBundler, type BundlerOptions, type GasValues } from './BaseBundler'

export class EtherspotBundler extends BaseBundler {
	constructor(chainId: bigint, url: string, options?: BundlerOptions) {
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

		if (this.onAfterEstimation) {
			gasValues = await this.onAfterEstimation(gasValues)
		}

		return gasValues
	}
}

export class EtherspotBundlerError extends SendopError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'EtherspotBundlerError'
	}
}
