import type { GasValues } from '@/sendop'
import type { UserOperation } from 'ethers-erc4337'
import { SendopError } from '@/error'
import { z } from 'zod'
import { BaseBundler, type BundlerOptions } from './BaseBundler'

export type PimlicoBundlerOptions = BundlerOptions & {
	gasPriceType?: 'slow' | 'standard' | 'fast'
}

export class PimlicoBundler extends BaseBundler {
	public gasPriceType: Exclude<PimlicoBundlerOptions['gasPriceType'], undefined>

	constructor(chainId: bigint, url: string, options?: PimlicoBundlerOptions) {
		super(chainId, url, options)
		this.gasPriceType = options?.gasPriceType ?? 'standard'
	}

	async _getGasValues(userOp: UserOperation): Promise<GasValues> {
		const parsed = gasPriceSchema.safeParse(
			await this.rpcProvider.send({
				method: 'pimlico_getUserOperationGasPrice', // https://docs.pimlico.io/infra/bundler/endpoints/pimlico_getUserOperationGasPrice
			}),
		)
		if (!parsed.success) {
			throw new PimlicoBundlerError(`Invalid gas price response: ${parsed.error}`)
		}

		const maxFeePerGas = parsed.data[this.gasPriceType].maxFeePerGas
		const maxPriorityFeePerGas = parsed.data[this.gasPriceType].maxPriorityFeePerGas

		// Pimlico bundler requires user operation max fee per gas to be larger than 0 during gas estimation
		userOp.maxFeePerGas = 1n
		userOp.maxPriorityFeePerGas = 1n

		// https://docs.pimlico.io/infra/bundler/endpoints/eth_estimateUserOperationGas
		const estimateGas = await this.estimateUserOperationGas(userOp)

		let gasValues: GasValues = {
			maxFeePerGas: BigInt(maxFeePerGas),
			maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
			preVerificationGas: estimateGas.preVerificationGas,
			verificationGasLimit: estimateGas.verificationGasLimit,
			callGasLimit: estimateGas.callGasLimit,
			paymasterVerificationGasLimit: estimateGas.paymasterVerificationGasLimit,
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

const gasPriceSchema = z.object({
	slow: z.object({
		maxFeePerGas: z.string().startsWith('0x'),
		maxPriorityFeePerGas: z.string().startsWith('0x'),
	}),
	standard: z.object({
		maxFeePerGas: z.string().startsWith('0x'),
		maxPriorityFeePerGas: z.string().startsWith('0x'),
	}),
	fast: z.object({
		maxFeePerGas: z.string().startsWith('0x'),
		maxPriorityFeePerGas: z.string().startsWith('0x'),
	}),
})
