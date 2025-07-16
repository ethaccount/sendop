import { EntryPointV07__factory } from '@/contract-types'
import { ENTRY_POINT_V07_ADDRESS } from '@/core'
import { encode7579Executions, type ERC7579ExecModeConfig } from '@/erc7579'
import { AbstractModularAccount, type Execution, type ValidationAPI } from '@/types'
import { zeroBytes } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { concat, hexlify } from 'ethers/utils'
import { NexusValidationMode, type NexusNonceConfig } from './types'

export class NexusAccountAPI extends AbstractModularAccount {
	id = 'biconomy.nexus.1.2.0'
	entryPointAddress = ENTRY_POINT_V07_ADDRESS

	private validatorAddress: string
	private nonceConfig?: NexusNonceConfig
	private execModeConfig?: ERC7579ExecModeConfig

	constructor({
		validation,
		validatorAddress,
		config,
	}: {
		validation: ValidationAPI
		validatorAddress: string
		config?: {
			nonceConfig?: NexusNonceConfig
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
		return BigInt(hexlify(this._getNonceKey(this.nonceConfig)))
	}

	/**
	 * @dev [3 bytes empty][1 bytes validation mode][20 bytes validator][8 bytes nonce]
	 * @param config default value is { mode: NexusValidationMode.VALIDATION, validator: this.validatorAddress, key: zeroBytes(3) }
	 * @returns hex string
	 */
	private _getNonceKey(config?: NexusNonceConfig) {
		const defaultOptions = {
			mode: NexusValidationMode.VALIDATION,
			validator: this.validatorAddress,
			key: zeroBytes(3),
		}
		const { mode, validator, key } = { ...defaultOptions, ...config }
		return concat([key, mode, validator])
	}
}
