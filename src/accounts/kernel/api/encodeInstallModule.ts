import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { INTERFACES } from '@/interfaces'
import { abiEncode } from '@/utils'
import { concat, ZeroAddress } from 'ethers'
import type { KernelInstallModuleConfig } from '../types'

export function encodeInstallModule(config: KernelInstallModuleConfig): string {
	let initData: string

	switch (config.moduleType) {
		case ERC7579_MODULE_TYPE.VALIDATOR:
			{
				// default values
				const hookAddress = config.hookAddress ?? ZeroAddress
				const hookData = config.hookData ?? '0x'
				const selectorData = config.selectorData ?? '0x'

				initData = concat([
					hookAddress,
					abiEncode(['bytes', 'bytes', 'bytes'], [config.initData, hookData, selectorData]),
				])
			}
			break

		case ERC7579_MODULE_TYPE.EXECUTOR:
			{
				// default values
				const hookAddress = config.hookAddress ?? ZeroAddress
				const hookData = config.hookData ?? '0x'
				initData = concat([hookAddress, abiEncode(['bytes', 'bytes'], [config.initData, hookData])])
			}
			break

		case ERC7579_MODULE_TYPE.FALLBACK:
			initData = concat([
				config.selector,
				config.hookAddress,
				abiEncode(['bytes', 'bytes'], [config.selectorData, config.hookData]),
			])
			break

		case ERC7579_MODULE_TYPE.HOOK:
			initData = config.initData
			break

		default:
			throw new Error(`[Kernel.encodeInstallModule] Unsupported module type`)
	}

	return INTERFACES.KernelV3.encodeFunctionData('installModule', [config.moduleType, config.moduleAddress, initData])
}
