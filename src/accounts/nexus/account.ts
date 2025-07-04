import { encode7579Executions, type ERC7579ExecModeConfig } from '@/erc7579'
import { AbstractModularAccount, type Execution, type ValidationAPI } from '@/types'
import { zeroBytes } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, EntryPointV07__factory } from 'ethers-erc4337'
import { concat, hexlify } from 'ethers/utils'
import { NexusValidationMode, type NexusAccountConfig } from './types'

export class NexusAccountAPI extends AbstractModularAccount {
	id = 'biconomy.nexus.1.0.2'
	entryPointAddress = ENTRY_POINT_V07_ADDRESS

	private validatorAddress: string
	private nexusConfig?: NexusAccountConfig
	private execModeConfig?: ERC7579ExecModeConfig

	constructor({
		validation,
		validatorAddress,
		config,
	}: {
		validation: ValidationAPI
		validatorAddress: string
		config?: {
			nexusConfig?: NexusAccountConfig
			execModeConfig?: ERC7579ExecModeConfig
		}
	}) {
		super(validation)
		this.validatorAddress = validatorAddress
		this.nexusConfig = config?.nexusConfig
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
		return BigInt(hexlify(this._getNonceKey(this.nexusConfig?.nonce)))
	}

	/**
	 * @dev [3 bytes empty][1 bytes validation mode][20 bytes validator][8 bytes nonce]
	 * @param options default value is { mode: NexusValidationMode.VALIDATION, validator: this.validatorAddress, key: zeroBytes(3) }
	 * @returns hex string
	 */
	private _getNonceKey(options?: { mode?: NexusValidationMode; validator?: string; key?: string }) {
		const defaultOptions = {
			mode: NexusValidationMode.VALIDATION,
			validator: this.validatorAddress,
			key: zeroBytes(3),
		}
		const { mode, validator, key } = { ...defaultOptions, ...options }
		return concat([key, mode, validator])
	}
}
