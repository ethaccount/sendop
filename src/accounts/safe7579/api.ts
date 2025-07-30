import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { INTERFACES } from '@/interfaces'
import { abiEncode, randomBytes32, sortAndUniquifyAddresses } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { Contract, dataLength, Interface, isHexString } from 'ethers'
import { ZeroAddress } from 'ethers/constants'
import { concat } from 'ethers/utils'
import {
	type Safe7579CreationOptions,
	type Safe7579InstallModuleConfig,
	type Safe7579UninstallModuleConfig,
} from './types'

export class Safe7579API {
	static implementationAddress = '0x7579EE8307284F293B1927136486880611F20002'
	static factoryAddress = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67'

	static SafeAddress = '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762'
	static Safe7579LaunchpadAddress = '0x7579011aB74c46090561ea277Ba79D510c6C00ff'

	// https://github.com/safe-global/safe-smart-account/blob/v1.4.1/contracts/proxies/SafeProxyFactory.sol
	static factoryInterface = new Interface([
		'function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) public returns (address proxy)',
		'function proxyCreationCode() public pure returns (bytes memory)',
	])

	// https://github.com/rhinestonewtf/safe7579/blob/v1.0.0/src/Safe7579Launchpad.sol
	static launchpadInterface = new Interface([
		'function predictSafeAddress(address singleton, address safeProxyFactory, bytes memory creationCode, bytes32 salt, bytes memory factoryInitializer) external pure returns (address safeProxy)',
		'function addSafe7579(address safe7579, tuple(address module, bytes initData)[] calldata validators, tuple(address module, bytes initData)[] calldata executors, tuple(address module, bytes initData)[] calldata fallbacks, tuple(address module, bytes initData)[] calldata hooks, address[] calldata attesters, uint8 threshold) external',
	])

	// https://github.com/rhinestonewtf/safe7579/blob/v1.0.0/src/Safe7579.sol
	static accountInterface = new Interface([
		'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external',
	])

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
		const factoryData = Safe7579API.factoryInterface.encodeFunctionData('createProxyWithNonce', [
			Safe7579API.SafeAddress,
			initializer,
			salt,
		])

		const accountAddress = await Safe7579API.computeAccountAddress(client, fullCreationOptions)

		return { factory: Safe7579API.factoryAddress, factoryData, accountAddress }
	}

	static async computeAccountAddress(client: JsonRpcProvider, creationOptions: Safe7579CreationOptions) {
		const initializer = Safe7579API.getInitializer(creationOptions)
		const launchpad = new Contract(Safe7579API.Safe7579LaunchpadAddress, Safe7579API.launchpadInterface, client)
		const factory = new Contract(Safe7579API.factoryAddress, Safe7579API.factoryInterface, client)

		return await launchpad.predictSafeAddress(
			Safe7579API.SafeAddress,
			Safe7579API.factoryAddress,
			await factory.proxyCreationCode(),
			creationOptions.salt,
			initializer,
		)
	}

	static getInitCode(creationOptions: Safe7579CreationOptions): string {
		return concat([
			Safe7579API.factoryAddress,
			Safe7579API.factoryInterface.encodeFunctionData('createProxyWithNonce', [
				Safe7579API.SafeAddress,
				Safe7579API.getInitializer(creationOptions),
				creationOptions.salt,
			]),
		])
	}

	static getInitializer(creationOptions: Safe7579CreationOptions): string {
		const { validatorAddress, validatorInitData, owners, ownersThreshold, attesters, attestersThreshold } =
			creationOptions

		return Safe7579API.accountInterface.encodeFunctionData('setup', [
			owners, // address[] calldata _owners
			ownersThreshold, // uint256 _threshold
			Safe7579API.Safe7579LaunchpadAddress,
			Safe7579API.launchpadInterface.encodeFunctionData('addSafe7579', [
				Safe7579API.implementationAddress,
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
			Safe7579API.implementationAddress, // address fallbackHandler
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
		return INTERFACES.IERC7579Account.encodeFunctionData('installModule', [
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

		return INTERFACES.IERC7579Account.encodeFunctionData('uninstallModule', [
			config.moduleType,
			config.moduleAddress,
			moduleDeInitData,
		])
	}

	static async sign1271({
		validatorAddress,
		hash,
		signHash,
	}: {
		validatorAddress: string
		hash: Uint8Array
		signHash: (hash: Uint8Array) => Promise<string>
	}) {
		const sig = await signHash(hash)
		return concat([validatorAddress, sig])
	}
}
