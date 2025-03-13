import type { UserOp } from '@/core'
import ADDRESS from '@/addresses'
import { SendopError } from '@/error'
import { toBeHex } from 'ethers'
import { BaseBundler, type BundlerOptions, type GasValues } from './BaseBundler'

export class PimlicoBundler extends BaseBundler {
	constructor(chainId: string, url: string, options?: BundlerOptions) {
		super(chainId, url, options)
	}

	async getGasValues(userOp: UserOp): Promise<GasValues> {
		// Get gas price
		const curGasPrice = await this.rpcProvider.send({ method: 'pimlico_getUserOperationGasPrice' })
		if (!curGasPrice?.standard?.maxFeePerGas) {
			throw new PimlicoBundlerError('Invalid gas price response from rpcProvider')
		}

		userOp.maxFeePerGas = curGasPrice.standard.maxFeePerGas

		// Send eth_estimateUserOperationGas
		const estimateGas = await this.estimateUserOperationGas(userOp)

		let gasValues: GasValues = {
			maxFeePerGas: toBeHex(curGasPrice.standard.maxFeePerGas),
			maxPriorityFeePerGas: toBeHex(curGasPrice.standard.maxPriorityFeePerGas),
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

export class PimlicoBundlerError extends SendopError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'PimlicoBundlerError'
	}
}
