import type { GasValues } from '@/sendop'
import type { UserOperation } from 'ethers-erc4337'
import { SendopError } from '@/error'
import { BaseBundler, type BundlerOptions } from './BaseBundler'
import { z } from 'zod'

export class AlchemyBundler extends BaseBundler {
	constructor(chainId: bigint, url: string, options?: BundlerOptions) {
		super(chainId, url, options)
	}

	async _getGasValues(userOp: UserOperation): Promise<GasValues> {
		const [block, maxPriorityFeePerGas] = await Promise.all([
			this.rpcProvider.send({ method: 'eth_getBlockByNumber', params: ['latest', true] }), // https://docs.alchemy.com/reference/eth-getblockbynumber
			this.rpcProvider.send({ method: 'rundler_maxPriorityFeePerGas' }), // https://docs.alchemy.com/reference/rundler-maxpriorityfeepergas
		])

		const blockResult = blockResponseSchema.safeParse(block)
		if (!blockResult.success) {
			throw new AlchemyBundlerError('Invalid block response: ' + blockResult.error.message)
		}

		const maxPriorityFeeResult = maxPriorityFeeResponseSchema.safeParse(maxPriorityFeePerGas)
		if (!maxPriorityFeeResult.success) {
			throw new AlchemyBundlerError(
				'Invalid maxPriorityFeePerGas response: ' + maxPriorityFeeResult.error.message,
			)
		}

		// Refer to Alchemy's account-kit: https://github.com/alchemyplatform/aa-sdk/blob/f7c7911cdc1f690db4107e21956469955c990bc8/account-kit/infra/src/middleware/feeEstimator.ts#L34-L54
		const maxFeePerGas = (BigInt(blockResult.data.baseFeePerGas) * 150n) / 100n + BigInt(maxPriorityFeeResult.data)

		const estimateGas = await this.estimateUserOperationGas(userOp)

		let gasValues: GasValues = {
			maxFeePerGas: maxFeePerGas,
			maxPriorityFeePerGas: BigInt(maxPriorityFeeResult.data),
			preVerificationGas: estimateGas.preVerificationGas,
			verificationGasLimit: estimateGas.verificationGasLimit,
			callGasLimit: estimateGas.callGasLimit,
			paymasterVerificationGasLimit: estimateGas.paymasterVerificationGasLimit,
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

const blockResponseSchema = z.object({
	baseFeePerGas: z.string().startsWith('0x'),
})

const maxPriorityFeeResponseSchema = z.string().startsWith('0x')
