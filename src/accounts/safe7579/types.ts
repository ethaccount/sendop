import { CallType, ERC7579_MODULE_TYPE, type BaseInstallModuleConfig, type BaseUninstallModuleConfig } from '@/erc7579'

export type Safe7579CreationOptions = {
	salt: string
	validatorAddress: string
	validatorInitData: string
	owners: string[]
	ownersThreshold: number
	attesters: string[]
	attestersThreshold: number
}

export type Safe7579InstallModuleConfig =
	| BaseInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR>
	| BaseInstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR>
	| (BaseInstallModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
			functionSig: string // 4 bytes
			callType: CallType // 1 byte
	  })
	| (BaseInstallModuleConfig<ERC7579_MODULE_TYPE.HOOK> & {
			hookType: Safe7579HookType // 1 byte
			selector: string // 4 bytes
	  })

export enum Safe7579HookType {
	GLOBAL = '0x00',
	SIG = '0x01',
}

export type Safe7579UninstallModuleConfig =
	| (BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> & {
			prev: string // address
	  })
	| (BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR> & {
			prev: string // address
	  })
	| (BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
			functionSig: string // 4 bytes
	  })
	| BaseUninstallModuleConfig<ERC7579_MODULE_TYPE.HOOK>

export type Safe7579NonceConfig = {
	key: string // 4 bytes
}
