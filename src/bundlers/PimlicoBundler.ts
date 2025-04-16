import type { UserOp } from '@/core'
import { SendopError } from '@/error'
import { BaseBundler, type BundlerOptions, type GasValues } from './BaseBundler'

type PimlicoGasPrice = {
	slow: {
		maxFeePerGas: string
		maxPriorityFeePerGas: string
	}
	standard: {
		maxFeePerGas: string
		maxPriorityFeePerGas: string
	}
	fast: {
		maxFeePerGas: string
		maxPriorityFeePerGas: string
	}
}

export class PimlicoBundler extends BaseBundler {
	constructor(chainId: bigint, url: string, options?: BundlerOptions) {
		super(chainId, url, options)
	}

	async _getGasValues(userOp: UserOp): Promise<GasValues> {
		// Get gas price
		// TODO: better way to handle the response
		const curGasPrice: PimlicoGasPrice = await this.rpcProvider.send({
			method: 'pimlico_getUserOperationGasPrice',
		})
		if (!curGasPrice?.standard?.maxFeePerGas) {
			throw new PimlicoBundlerError('Invalid gas price response from rpcProvider')
		}

		// Ensure userOp.maxFeePerGas is greater than 0 before gas estimation
		// TODO: check if this is correct
		userOp.maxFeePerGas = BigInt(curGasPrice.standard.maxFeePerGas)

		// Send eth_estimateUserOperationGas
		const estimateGas = await this.estimateUserOperationGas(userOp)

		let gasValues: GasValues = {
			maxFeePerGas: BigInt(curGasPrice.standard.maxFeePerGas),
			maxPriorityFeePerGas: BigInt(curGasPrice.standard.maxPriorityFeePerGas),
			preVerificationGas: BigInt(estimateGas.preVerificationGas),
			verificationGasLimit: BigInt(estimateGas.verificationGasLimit),
			callGasLimit: BigInt(estimateGas.callGasLimit),
		}

		return gasValues
	}
}

export class PimlicoBundlerError extends SendopError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'PimlicoBundlerError'
	}
}
