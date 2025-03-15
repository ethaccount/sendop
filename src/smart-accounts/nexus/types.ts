import type { ERC7579_MODULE_TYPE } from '@/core/erc7579'

export enum NexusValidationMode {
	VALIDATION = '0x00',
	MODULE_ENABLE = '0x01',
}

// TODO: add other bootstrap functions
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

export type BaseNexusInstallModuleConfig<T extends ERC7579_MODULE_TYPE> = {
	moduleType: T
	moduleAddress: string
	initData: string
}

export type ValidatorNexusInstallModuleConfig = BaseNexusInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR>

export type NexusInstallModuleConfig = ValidatorNexusInstallModuleConfig
