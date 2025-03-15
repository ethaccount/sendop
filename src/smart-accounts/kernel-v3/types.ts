import type { ERC7579_MODULE_TYPE } from '@/core'

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

export type BaseKernelInstallModuleConfig<T extends ERC7579_MODULE_TYPE> = {
	moduleType: T
	moduleAddress: string
}

export type ValidatorKernelInstallModuleConfig = BaseKernelInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> & {
	hookAddress?: string
	validatorData: string
	hookData?: string
	selectorData?: string // 4 bytes
}

export type ExecutorKernelInstallModuleConfig = BaseKernelInstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR> & {
	hookAddress?: string
	executorData: string
	hookData?: string
}

export type FallbackKernelInstallModuleConfig = BaseKernelInstallModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
	selector: string // 4 bytes
	hookAddress: string
	selectorData: string
	hookData: string
}

export type SimpleKernelInstallModuleConfig<T extends ERC7579_MODULE_TYPE.HOOK> = BaseKernelInstallModuleConfig<T> & {
	initData: string
}

export type KernelInstallModuleConfig =
	| ValidatorKernelInstallModuleConfig
	| ExecutorKernelInstallModuleConfig
	| FallbackKernelInstallModuleConfig
	| SimpleKernelInstallModuleConfig<ERC7579_MODULE_TYPE.HOOK>
