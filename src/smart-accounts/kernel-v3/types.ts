import type { Bundler, ERC7579_MODULE_TYPE, ERC7579Validator, PaymasterGetter } from '@/core'
import type { JsonRpcProvider } from 'node_modules/ethers/lib.esm/providers/provider-jsonrpc'

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

export type KernelV3AccountOptions = {
	client: JsonRpcProvider
	bundler: Bundler
	erc7579Validator: ERC7579Validator
	address?: string
	pmGetter?: PaymasterGetter
	vType?: KernelValidationType
}

export type KernelCreationOptions = {
	salt: string
	validatorAddress: string
	validatorInitData: string
	hookAddress?: string
	hookData?: string
	initConfig?: string[]
}

export type BaseModuleConfig<T extends ERC7579_MODULE_TYPE> = {
	moduleType: T
	moduleAddress: string
}

export type ValidatorModuleConfig = BaseModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> & {
	hookAddress?: string
	validatorData: string
	hookData?: string
	selectorData?: string // 4 bytes
}

export type ExecutorModuleConfig = BaseModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR> & {
	hookAddress?: string
	executorData: string
	hookData?: string
}

export type FallbackModuleConfig = BaseModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
	selector: string // 4 bytes
	hookAddress: string
	selectorData: string
	hookData: string
}

export type SimpleModuleConfig<T extends ERC7579_MODULE_TYPE.HOOK> = BaseModuleConfig<T> & {
	initData: string
}

export type ModuleConfig =
	| ValidatorModuleConfig
	| ExecutorModuleConfig
	| FallbackModuleConfig
	| SimpleModuleConfig<ERC7579_MODULE_TYPE.HOOK>
