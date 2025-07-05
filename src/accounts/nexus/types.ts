import type { BaseInstallModuleConfig, BaseUninstallModuleConfig } from '@/erc7579'
import { ERC7579_MODULE_TYPE, CallType } from '@/erc7579'

export enum NexusValidationMode {
	VALIDATION = '0x00',
	MODULE_ENABLE = '0x01',
}

export type NexusCreationOptions = SingleValidatorCreation

export type SingleValidatorCreation = {
	bootstrap: 'initNexusWithSingleValidator'
	salt: string
	validatorAddress: string
	validatorInitData: string
	registryAddress: string
	attesters: string[]
	threshold: number
}

export type NexusInstallModuleConfig =
	| BaseInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR>
	| BaseInstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR>
	| (BaseInstallModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
			functionSig: string // 4 bytes
			callType: CallType // 1 byte
	  })
	| BaseInstallModuleConfig<ERC7579_MODULE_TYPE.HOOK>

export type NexusUninstallModuleConfig =
	| (BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> & {
			prev: string // address
	  })
	| (BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR> & {
			prev: string // address
	  })
	| (BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
			selector: string // 4 bytes
	  })
	| BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.HOOK>

export type NexusNonceConfig = {
	mode?: NexusValidationMode // 1 byte
	validator?: string // 20 bytes
	key?: string // 3 bytes
}
