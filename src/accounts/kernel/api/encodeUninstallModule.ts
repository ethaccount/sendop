import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { INTERFACES } from '@/interfaces'
import type { KernelUninstallModuleConfig } from '../types'

export function encodeUninstallModule(config: KernelUninstallModuleConfig): string {
	let deInitData: string
	switch (config.moduleType) {
		case ERC7579_MODULE_TYPE.VALIDATOR:
			deInitData = config.deInitData
			break

		case ERC7579_MODULE_TYPE.EXECUTOR:
			deInitData = config.deInitData
			break
		default:
			throw new Error(`[Kernel.encodeUninstallModule] Unsupported module type`)
	}

	return INTERFACES.IERC7579Account.encodeFunctionData('uninstallModule', [
		config.moduleType,
		config.moduleAddress,
		deInitData,
	])
}
