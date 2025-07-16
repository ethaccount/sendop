import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { INTERFACES } from '@/interfaces'
import { abiEncode, randomBytes32, sortAndUniquifyAddresses } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { Contract, dataLength, Interface, isHexString } from 'ethers'
import { concat } from 'ethers/utils'
import type { NexusCreationOptions, NexusInstallModuleConfig, NexusUninstallModuleConfig } from './types'

export class NexusAPI {
	// https://docs.biconomy.io/contracts-and-audits#nexus-v120--for-chains-with-eip-7702-support
	static implementationAddress = '0x0000000025a29E0598c88955fd00E256691A089c'
	static bootstrapAddress = '0x000000001aafD7ED3B8baf9f46cD592690A5BBE5'
	static factoryAddress = '0x000000008b898679A19ac138831F26bE07a2aA08'

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

		// https://github.com/bcnmy/nexus/blob/8db1a6e41780dd0cc85298b0cbe6ab493adc6bb5/contracts/interfaces/factory/INexusFactory.sol/#L49https://github.com/bcnmy/nexus/blob/8db1a6e41780dd0cc85298b0cbe6ab493adc6bb5/contracts/interfaces/factory/INexusFactory.sol/#L49
		const factoryInterface = new Interface([
			'function createAccount(bytes calldata initData, bytes32 salt) external payable returns (address payable)',
			'function computeAccountAddress(bytes calldata initData, bytes32 salt) external view returns (address payable expectedAddress)',
		])

		const initializeData = getInitializeData(fullCreationOptions)
		const factoryData = factoryInterface.encodeFunctionData('createAccount', [initializeData, salt])

		const nexusFactory = new Contract(NexusAPI.factoryAddress, factoryInterface, client)
		const accountAddress = await nexusFactory.computeAccountAddress(initializeData, fullCreationOptions.salt)

		return { factory: NexusAPI.factoryAddress, factoryData, accountAddress }
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
		return INTERFACES.IERC7579Account.encodeFunctionData('installModule', [
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

		return INTERFACES.IERC7579Account.encodeFunctionData('uninstallModule', [
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
			// https://github.com/bcnmy/nexus/blob/8db1a6e41780dd0cc85298b0cbe6ab493adc6bb5/contracts/utils/NexusBootstrap.sol#L208C14-L208C52
			const bootstrapInterface = new Interface([
				'function initNexusWithSingleValidator(address validator, bytes calldata data, tuple(address registry, address[] attesters, uint8 threshold) registryConfig) external',
			])

			bootstrapCalldata = bootstrapInterface.encodeFunctionData('initNexusWithSingleValidator', [
				creationOptions.validatorAddress,
				creationOptions.validatorInitData,
				{
					registry: creationOptions.registryAddress,
					attesters: sortAndUniquifyAddresses(creationOptions.attesters),
					threshold: creationOptions.threshold,
				},
			])
			break
		// NICE-TO-HAVE: implement other bootstrap functions
		default:
			throw new Error('[Nexus.getInitializeData] Unsupported bootstrap function')
	}
	return abiEncode(['address', 'bytes'], [NexusAPI.bootstrapAddress, bootstrapCalldata])
}
