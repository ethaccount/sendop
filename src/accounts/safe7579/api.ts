import { ADDRESS } from '@/addresses'
import { Safe7579Launchpad__factory, SafeProxyFactory__factory } from '@/contract-types'
import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { INTERFACES } from '@/interfaces'
import { abiEncode, randomBytes32, sortAndUniquifyAddresses } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { dataLength, isHexString } from 'ethers'
import { ZeroAddress } from 'ethers/constants'
import { concat } from 'ethers/utils'
import {
	type Safe7579CreationOptions,
	type Safe7579InstallModuleConfig,
	type Safe7579UninstallModuleConfig,
} from './types'

export class Safe7579API {
	static async getDeployment({
		client,
		creationOptions,
		salt = randomBytes32(),
	}: {
		client: JsonRpcProvider
		creationOptions: Omit<Safe7579CreationOptions, 'salt'>
		salt?: string
	}) {
		const fullCreationOptions = { ...creationOptions, salt }

		const initializer = Safe7579API.getInitializer(fullCreationOptions)
		const factoryData = INTERFACES.SafeProxyFactory.encodeFunctionData('createProxyWithNonce', [
			ADDRESS.Safe,
			initializer,
			salt,
		])

		const accountAddress = await Safe7579API.computeAccountAddress(client, fullCreationOptions)

		return { factory: ADDRESS.SafeProxyFactory, factoryData, accountAddress }
	}

	static async computeAccountAddress(client: JsonRpcProvider, creationOptions: Safe7579CreationOptions) {
		const initializer = Safe7579API.getInitializer(creationOptions)
		const launchpad = Safe7579Launchpad__factory.connect(ADDRESS.Safe7579Launchpad, client)

		return await launchpad.predictSafeAddress(
			ADDRESS.Safe,
			ADDRESS.SafeProxyFactory,
			await SafeProxyFactory__factory.connect(ADDRESS.SafeProxyFactory, client).proxyCreationCode(),
			creationOptions.salt,
			initializer,
		)
	}

	static getInitCode(creationOptions: Safe7579CreationOptions): string {
		return concat([
			ADDRESS.SafeProxyFactory,
			INTERFACES.SafeProxyFactory.encodeFunctionData('createProxyWithNonce', [
				ADDRESS.Safe,
				Safe7579API.getInitializer(creationOptions),
				creationOptions.salt,
			]),
		])
	}

	static getInitializer(creationOptions: Safe7579CreationOptions): string {
		const { validatorAddress, validatorInitData, owners, ownersThreshold, attesters, attestersThreshold } =
			creationOptions

		return INTERFACES.ISafe.encodeFunctionData('setup', [
			owners, // address[] calldata _owners
			ownersThreshold, // uint256 _threshold
			ADDRESS.Safe7579Launchpad,
			INTERFACES.Safe7579Launchpad.encodeFunctionData('addSafe7579', [
				ADDRESS.Safe7579,
				[
					{
						module: validatorAddress,
						initData: validatorInitData,
					},
				],
				[], // executors
				[], // fallbacks
				[], // hooks
				sortAndUniquifyAddresses(attesters),
				attestersThreshold,
			]),
			ADDRESS.Safe7579, // address fallbackHandler
			ZeroAddress, // address paymentToken
			0n, // uint256 payment
			ZeroAddress, // address payable paymentReceiver
		])
	}

	static encodeInstallModule(config: Safe7579InstallModuleConfig): string {
		if (!isHexString(config.initData)) {
			throw new Error('[Safe7579.encodeInstallModule] Invalid Safe7579InstallModuleConfig.initData')
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
					throw new Error('[Safe7579.encodeInstallModule] Invalid Safe7579InstallModuleConfig.functionSig')
				}
				if (dataLength(config.callType) !== 1) {
					throw new Error('[Safe7579.encodeInstallModule] Invalid Safe7579InstallModuleConfig.callType')
				}
				moduleInitData = abiEncode(
					['bytes4', 'bytes1', 'bytes'],
					[config.functionSig, config.callType, config.initData],
				)
				break
			case ERC7579_MODULE_TYPE.HOOK:
				if (dataLength(config.hookType) !== 1) {
					throw new Error('[Safe7579.encodeInstallModule] Invalid Safe7579InstallModuleConfig.hookType')
				}
				if (dataLength(config.selector) !== 4) {
					throw new Error('[Safe7579.encodeInstallModule] Invalid Safe7579InstallModuleConfig.selector')
				}
				moduleInitData = abiEncode(
					['bytes1', 'bytes4', 'bytes'],
					[config.hookType, config.selector, config.initData],
				)
				break
			default:
				throw new Error('[Safe7579.encodeInstallModule] Invalid Safe7579InstallModuleConfig.moduleType')
		}
		return INTERFACES.ISafe7579.encodeFunctionData('installModule', [
			config.moduleType,
			config.moduleAddress,
			moduleInitData,
		])
	}

	static encodeUninstallModule(config: Safe7579UninstallModuleConfig): string {
		if (!isHexString(config.deInitData)) {
			throw new Error('[Safe7579.encodeUninstallModule] Invalid Safe7579UninstallModuleConfig.deInitData')
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
				moduleDeInitData = concat([config.functionSig, config.deInitData])
				break
			case ERC7579_MODULE_TYPE.HOOK:
				moduleDeInitData = config.deInitData
				break
			default:
				throw new Error('[Safe7579.encodeUninstallModule] Invalid Safe7579UninstallModuleConfig.moduleType')
		}

		return INTERFACES.ISafe7579.encodeFunctionData('uninstallModule', [
			config.moduleType,
			config.moduleAddress,
			moduleDeInitData,
		])
	}
}
