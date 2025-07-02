import type { BaseInstallModuleConfig, BaseModuleConfig, BaseUninstallModuleConfig } from '@/erc7579'
import { ERC7579_MODULE_TYPE } from '@/erc7579'

export enum KernelValidationMode {
	DEFAULT = '0x00',
	ENABLE = '0x01',
	INSTALL = '0x02',
}

export enum KernelValidationType {
	ROOT = '0x00',
	VALIDATOR = '0x01',
	PERMISSION = '0x02',
}

export type KernelCreationOptions = {
	salt: string
	validatorAddress: string
	validatorInitData: string
	hookAddress?: string
	hookData?: string
	initConfig?: string[]
}

export type ValidatorKernelInstallModuleConfig = BaseInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> & {
	hookAddress?: string
	hookData?: string
	selectorData?: string // 4 bytes
}

export type ExecutorKernelInstallModuleConfig = BaseInstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR> & {
	hookAddress?: string
	hookData?: string
}

export type FallbackKernelInstallModuleConfig = BaseModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
	selector: string // 4 bytes
	hookAddress: string
	selectorData: string
	hookData: string
}

export type KernelInstallModuleConfig =
	| ValidatorKernelInstallModuleConfig
	| ExecutorKernelInstallModuleConfig
	| FallbackKernelInstallModuleConfig
	| BaseInstallModuleConfig<ERC7579_MODULE_TYPE.HOOK>

export type KernelUninstallModuleConfig =
	| BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR>
	| BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR>
