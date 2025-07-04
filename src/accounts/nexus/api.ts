import { ADDRESS } from '@/addresses'
import { TNexusFactory__factory } from '@/contract-types'
import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { SendopError } from '@/error'
import { INTERFACES } from '@/interfaces'
import { abiEncode, randomBytes32, sortAndUniquifyAddresses } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { dataLength, isHexString } from 'ethers'
import { concat } from 'ethers/utils'
import type { NexusCreationOptions, NexusInstallModuleConfig, NexusUninstallModuleConfig } from './types'

export class Nexus {
	static async getDeployment({
		client,
		creationOptions,
		salt = randomBytes32(),
	}: {
		client: JsonRpcProvider
		creationOptions: Omit<NexusCreationOptions, 'salt'>
		salt?: string
	}) {
		const fullCreationOptions = { ...creationOptions, salt }

		const initializeData = getInitializeData(fullCreationOptions)
		const factoryData = INTERFACES.NexusFactory.encodeFunctionData('createAccount', [initializeData, salt])

		const nexusFactory = TNexusFactory__factory.connect(ADDRESS.NexusFactory, client)
		const accountAddress = await nexusFactory.computeAccountAddress(initializeData, fullCreationOptions.salt)

		return { factory: ADDRESS.NexusFactory, factoryData, accountAddress }
	}

	static encodeInstallModule(config: NexusInstallModuleConfig): string {
		if (!isHexString(config.initData)) {
			throw new Error('[Nexus.encodeInstallModule] Invalid NexusInstallModuleConfig.initData')
		}
		let moduleInitData: string
		switch (config.moduleType) {
			case ERC7579_MODULE_TYPE.VALIDATOR:
				moduleInitData = config.initData
				break
			case ERC7579_MODULE_TYPE.EXECUTOR:
				moduleInitData = config.initData
				break
			case ERC7579_MODULE_TYPE.FALLBACK:
				if (dataLength(config.functionSig) !== 4) {
					throw new Error('[Nexus.encodeInstallModule] Invalid NexusInstallModuleConfig.functionSig')
				}
				if (dataLength(config.callType) !== 1) {
					throw new Error('[Nexus.encodeInstallModule] Invalid NexusInstallModuleConfig.callType')
				}
				moduleInitData = concat([config.functionSig, config.callType, config.initData])
				break
			case ERC7579_MODULE_TYPE.HOOK:
				moduleInitData = config.initData
				break
			default:
				throw new Error('[Nexus.encodeInstallModule] Invalid NexusInstallModuleConfig.moduleType')
		}
		return INTERFACES.Nexus.encodeFunctionData('installModule', [
			config.moduleType,
			config.moduleAddress,
			moduleInitData,
		])
	}

	static encodeUninstallModule(config: NexusUninstallModuleConfig): string {
		if (!isHexString(config.deInitData)) {
			throw new Error('[Nexus.encodeUninstallModule] Invalid NexusUninstallModuleConfig.deInitData')
		}

		let moduleDeInitData: string

		switch (config.moduleType) {
			case ERC7579_MODULE_TYPE.VALIDATOR:
				moduleDeInitData = abiEncode(['address', 'bytes'], [config.prev, config.deInitData])
				break
			case ERC7579_MODULE_TYPE.EXECUTOR:
				moduleDeInitData = abiEncode(['address', 'bytes'], [config.prev, config.deInitData])
				break
			case ERC7579_MODULE_TYPE.FALLBACK:
				moduleDeInitData = concat([config.selector, config.deInitData])
				break
			case ERC7579_MODULE_TYPE.HOOK:
				moduleDeInitData = config.deInitData
				break
		}

		return INTERFACES.Nexus.encodeFunctionData('uninstallModule', [
			config.moduleType,
			config.moduleAddress,
			moduleDeInitData,
		])
	}
}

/**
 * @dev Nexus.initializeAccount's initData = abi.encode(bootstrap address, bootstrap calldata)
 */
function getInitializeData(creationOptions: NexusCreationOptions): string {
	let bootstrapCalldata: string
	switch (creationOptions.bootstrap) {
		case 'initNexusWithSingleValidator':
			bootstrapCalldata = INTERFACES.NexusBootstrap.encodeFunctionData('initNexusWithSingleValidator', [
				creationOptions.validatorAddress,
				creationOptions.validatorInitData,
				creationOptions.registryAddress,
				sortAndUniquifyAddresses(creationOptions.attesters),
				creationOptions.threshold,
			])
			break
		// NICE-TO-HAVE: implement other bootstrap functions
		default:
			throw new Error('[Nexus.getInitializeData] Unsupported bootstrap function')
	}
	return abiEncode(['address', 'bytes'], [ADDRESS.NexusBootstrap, bootstrapCalldata])
}
