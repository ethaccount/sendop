import type { UserOp } from '@/core'
import { SendopError } from '@/error'
import { toBeHex } from 'ethers'
import { BaseBundler, type BundlerOptions, type GasValues } from './BaseBundler'

export class AlchemyBundler extends BaseBundler {
	constructor(chainId: bigint, url: string, options?: BundlerOptions) {
		super(chainId, url, options)
	}

	/**
	 * Refer to Alchemy's account-kit method: https://github.com/alchemyplatform/aa-sdk/blob/f7c7911cdc1f690db4107e21956469955c990bc8/account-kit/infra/src/middleware/feeEstimator.ts#L34-L54
	 */
	async _getGasValues(userOp: UserOp): Promise<GasValues> {
		const [block, maxPriorityFeePerGas] = await Promise.all([
			this.rpcProvider.send({ method: 'eth_getBlockByNumber', params: ['latest', true] }),
			this.rpcProvider.send({ method: 'rundler_maxPriorityFeePerGas' }),
		])

		if (!block || !block.baseFeePerGas) {
			throw new AlchemyBundlerError('Missing baseFeePerGas in block')
		}

		if (!maxPriorityFeePerGas || maxPriorityFeePerGas === '0x0' || maxPriorityFeePerGas === '0x') {
			throw new AlchemyBundlerError('Invalid maxPriorityFeePerGas response from bundler')
		}

		const maxFeePerGas = (BigInt(block.baseFeePerGas) * 150n) / 100n + BigInt(maxPriorityFeePerGas)

		userOp.maxFeePerGas = maxFeePerGas

		// Send eth_estimateUserOperationGas
		const estimateGas = await this.estimateUserOperationGas(userOp)

		let gasValues: GasValues = {
			maxFeePerGas: maxFeePerGas,
			maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
			preVerificationGas: BigInt(estimateGas.preVerificationGas),
			verificationGasLimit: BigInt(estimateGas.verificationGasLimit),
			callGasLimit: BigInt(estimateGas.callGasLimit),
		}

		return gasValues
	}
}

export class AlchemyBundlerError extends SendopError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'AlchemyBundlerError'
	}
}
