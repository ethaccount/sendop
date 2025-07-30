import { EntryPointV07__factory } from '@/contract-types'
import { ENTRY_POINT_V07_ADDRESS } from '@/constants'
import { encode7579Executions, type ERC7579ExecModeConfig } from '@/erc7579'
import { AbstractModularAccount, type Execution, type ValidationAPI } from '@/types'
import { isBytes, zeroBytes } from '@/utils'
import { concat, type JsonRpcProvider } from 'ethers'
import type { Safe7579NonceConfig } from './types'

export class Safe7579AccountAPI extends AbstractModularAccount {
	id = 'rhinestone.safe7579.v1.0.0'
	entryPointAddress = ENTRY_POINT_V07_ADDRESS

	private validatorAddress: string
	private nonceConfig?: Safe7579NonceConfig
	private execModeConfig?: ERC7579ExecModeConfig

	constructor({
		validation,
		validatorAddress,
		config,
	}: {
		validation: ValidationAPI
		validatorAddress: string
		config?: {
			nonceConfig?: Safe7579NonceConfig
			execModeConfig?: ERC7579ExecModeConfig
		}
	}) {
		super(validation)
		this.validatorAddress = validatorAddress
		this.nonceConfig = config?.nonceConfig
		this.execModeConfig = config?.execModeConfig
	}

	async getNonce(client: JsonRpcProvider, address: string) {
		return await EntryPointV07__factory.connect(ENTRY_POINT_V07_ADDRESS, client as any).getNonce(
			address,
			this.getNonceKey(),
		)
	}

	async getCallData(executions: Execution[]): Promise<string> {
		return encode7579Executions(executions, this.execModeConfig)
	}

	private getNonceKey(): bigint {
		if (this.nonceConfig) {
			if (!isBytes(this.nonceConfig.key, 4)) {
				throw new Error('[Safe7579AccountAPI] nonceConfig.key must be 4 bytes')
			}
			return BigInt(concat([this.validatorAddress, this.nonceConfig.key]))
		}
		return BigInt(concat([this.validatorAddress, zeroBytes(4)]))
	}
}
