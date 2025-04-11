import type { UserOp } from '@/core'
import { SendopError } from '@/error'
import { toBeHex } from 'ethers'
import { BaseBundler, type BundlerOptions, type GasValues } from './BaseBundler'

export class SkandhaBundler extends BaseBundler {
	constructor(chainId: string, url: string, options?: BundlerOptions) {
		super(chainId, url, options)
	}

	async getGasValues(userOp: UserOp): Promise<GasValues> {
		// Get all gas values from estimateUserOperationGas
		const estimateGas = await this.estimateUserOperationGas(userOp)

		let gasValues: GasValues = {
			maxFeePerGas: toBeHex(estimateGas.maxFeePerGas),
			maxPriorityFeePerGas: toBeHex(estimateGas.maxPriorityFeePerGas),
			preVerificationGas: toBeHex(estimateGas.preVerificationGas),
			verificationGasLimit: estimateGas.verificationGasLimit,
			callGasLimit: estimateGas.callGasLimit,
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
