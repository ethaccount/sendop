import { EntryPointV07__factory } from '@/contract-types'
import { ENTRY_POINT_V07_ADDRESS } from '@/core'
import { encode7579Executions, type ERC7579ExecModeConfig } from '@/erc7579'
import { AbstractModularAccount, type Execution, type ValidationAPI } from '@/types'
import type { JsonRpcProvider } from 'ethers'
import { getNonceKey, type NonceConfig } from './api/getNonceKey'

export class KernelAccountAPI extends AbstractModularAccount {
	id = 'kernel.advanced.v0.3.3'
	entryPointAddress = ENTRY_POINT_V07_ADDRESS

	private validatorAddress: string
	private nonceConfig?: NonceConfig
	private execModeConfig?: ERC7579ExecModeConfig

	constructor({
		validation,
		validatorAddress,
		config,
	}: {
		validation: ValidationAPI
		validatorAddress: string
		config?: {
			nonceConfig?: NonceConfig
			execModeConfig?: ERC7579ExecModeConfig
			version?: '0.3.1' | '0.3.3'
		}
	}) {
		super(validation)
		this.validatorAddress = validatorAddress
		this.nonceConfig = config?.nonceConfig
		this.execModeConfig = config?.execModeConfig

		if (config?.version === '0.3.1') {
			this.id = 'kernel.advanced.v0.3.1'
		}
	}

	async getNonce(client: JsonRpcProvider, address: string) {
		return await EntryPointV07__factory.connect(ENTRY_POINT_V07_ADDRESS, client).getNonce(
			address,
			getNonceKey(this.validatorAddress, this.nonceConfig),
		)
	}

	async getCallData(executions: Execution[]): Promise<string> {
		return encode7579Executions(executions, this.execModeConfig)
	}
}
