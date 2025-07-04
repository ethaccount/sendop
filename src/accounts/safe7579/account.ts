import { encode7579Executions, type ERC7579ExecModeConfig } from '@/erc7579'
import { AbstractModularAccount, type Execution, type ValidationAPI } from '@/types'
import { zeroPadRight } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, EntryPointV07__factory } from 'ethers-erc4337'
import type { Safe7579AccountConfig } from './types'

export class Safe7579AccountAPI extends AbstractModularAccount {
	id = 'rhinestone.safe7579.v1.0.0'
	entryPointAddress = ENTRY_POINT_V07_ADDRESS

	private validatorAddress: string
	private safe7579Config?: Safe7579AccountConfig
	private execModeConfig?: ERC7579ExecModeConfig

	constructor({
		validation,
		validatorAddress,
		config,
	}: {
		validation: ValidationAPI
		validatorAddress: string
		config?: {
			safe7579Config?: Safe7579AccountConfig
			execModeConfig?: ERC7579ExecModeConfig
		}
	}) {
		super(validation)
		this.validatorAddress = validatorAddress
		this.safe7579Config = config?.safe7579Config
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
		return BigInt(zeroPadRight(this.validatorAddress, 24))
	}
}
