import type { GasValues } from '@/sendop'
import type { UserOperation } from 'ethers-erc4337'
import { SendopError } from '@/error'
import { BaseBundler, type BundlerOptions } from './BaseBundler'

export class EtherspotBundler extends BaseBundler {
	constructor(chainId: bigint, url: string, options?: BundlerOptions) {
		super(chainId, url, options)
	}

	async _getGasValues(userOp: UserOperation): Promise<GasValues> {
		// https://etherspot.fyi/api-endpoints/skandha/api-reference/estimate-userop
		const estimateGas = await this.estimateUserOperationGas(userOp)

		let gasValues: GasValues = {
			maxFeePerGas: estimateGas.maxFeePerGas,
			maxPriorityFeePerGas: estimateGas.maxPriorityFeePerGas,
			preVerificationGas: estimateGas.preVerificationGas,
			verificationGasLimit: estimateGas.verificationGasLimit,
			callGasLimit: estimateGas.callGasLimit,
			paymasterVerificationGasLimit: estimateGas.paymasterVerificationGasLimit,
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
