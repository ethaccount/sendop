import type { UserOp } from '@/core'
import { ADDRESS } from '@/addresses'
import { SendopError } from '@/error'
import { toBeHex } from 'ethers'
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
	constructor(chainId: string, url: string, options?: BundlerOptions) {
		super(chainId, url, options)
	}

	async getGasValues(userOp: UserOp): Promise<GasValues> {
		// Get gas price
		// TODO: better way to handle the response
		const curGasPrice: PimlicoGasPrice = await this.rpcProvider.send({
			method: 'pimlico_getUserOperationGasPrice',
		})
		if (!curGasPrice?.standard?.maxFeePerGas) {
			throw new PimlicoBundlerError('Invalid gas price response from rpcProvider')
		}

		userOp.maxFeePerGas = BigInt(curGasPrice.standard.maxFeePerGas)

		// Send eth_estimateUserOperationGas
		const estimateGas = await this.estimateUserOperationGas(userOp)

		let gasValues: GasValues = {
			maxFeePerGas: BigInt(curGasPrice.standard.maxFeePerGas),
			maxPriorityFeePerGas: BigInt(curGasPrice.standard.maxPriorityFeePerGas),
			preVerificationGas: estimateGas.preVerificationGas,
			verificationGasLimit: estimateGas.verificationGasLimit,
			callGasLimit: estimateGas.callGasLimit,
		}

		if (this.onGetGasValues) {
			gasValues = await this.onGetGasValues(gasValues)
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
