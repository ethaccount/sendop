import { ADDRESS } from '@/addresses'
import { TSafe7579Launchpad__factory, TSafeProxyFactory__factory } from '@/contract-types'
import type { CallType } from '@/core/erc7579'
import { ERC7579_MODULE_TYPE } from '@/core/erc7579'
import { SendopError } from '@/error'
import { INTERFACES } from '@/interfaces'
import { abiEncode, sortAndUniquifyAddresses, zeroPadRight } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { dataLength } from 'ethers'
import { ZeroAddress } from 'ethers/constants'
import { concat, isHexString } from 'ethers/utils'
import {
	ModularSmartAccount,
	type ModularSmartAccountOptions,
	type SimpleInstallModuleConfig,
	type SimpleUninstallModuleConfig,
} from '../ModularSmartAccount'

export type Safe7579CreationOptions = {
	salt: string
	validatorAddress: string
	validatorInitData: string
	owners: string[]
	ownersThreshold: number
	attesters: string[]
	attestersThreshold: number
}

export type Safe7579AccountOptions = ModularSmartAccountOptions

export class Safe7579Account extends ModularSmartAccount<Safe7579CreationOptions> {
	static override accountId() {
		return 'rhinestone.safe7579.v1.0.0'
	}

	constructor(options: Safe7579AccountOptions) {
		super(options)
	}

	override connect(address: string): Safe7579Account {
		return new Safe7579Account({
			...this._options,
			address,
		})
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

	static override async computeAccountAddress(client: JsonRpcProvider, creationOptions: Safe7579CreationOptions) {
		const initializer = Safe7579Account.getInitializer(creationOptions)
		const launchpad = TSafe7579Launchpad__factory.connect(ADDRESS.Safe7579Launchpad, client)

		return await launchpad.predictSafeAddress(
			ADDRESS.Safe,
			ADDRESS.SafeProxyFactory,
			await TSafeProxyFactory__factory.connect(ADDRESS.SafeProxyFactory, client).proxyCreationCode(),
			creationOptions.salt,
			initializer,
		)

		// ===================== compute address without calling predictSafeAddress function =====================

		// const proxyCreationCode = await TSafeProxyFactory__factory.connect(
		// 	ADDRESS.SafeProxyFactory,
		// 	client,
		// ).proxyCreationCode()
		// const deploymentData = concat([proxyCreationCode, zeroPadLeft(ADDRESS.Safe)])
		// const salt = keccak256(concat([keccak256(initializer), userSalt]))
		// const hash = keccak256(concat(['0xff', ADDRESS.SafeProxyFactory, salt, keccak256(deploymentData)]))
		// const computedAddress = getAddress(dataSlice(hash, 12))
	}

	static override getInitCode(creationOptions: Safe7579CreationOptions): string {
		return concat([
			ADDRESS.SafeProxyFactory,
			INTERFACES.SafeProxyFactory.encodeFunctionData('createProxyWithNonce', [
				ADDRESS.Safe,
				Safe7579Account.getInitializer(creationOptions),
				creationOptions.salt,
			]),
		])
	}

	override getInitCode(creationOptions: Safe7579CreationOptions): string {
		return Safe7579Account.getInitCode(creationOptions)
	}

	override getNonceKey(): bigint {
		return BigInt(zeroPadRight(this._options.validator.address(), 24))
	}

	static override encodeInstallModule(config: Safe7579InstallModuleConfig): string {
		if (!isHexString(config.initData)) {
			throw new Safe7579Error('Invalid Safe7579InstallModuleConfig.initData')
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
					throw new Safe7579Error('Invalid Safe7579InstallModuleConfig.functionSig')
				}
				if (dataLength(config.callType) !== 1) {
					throw new Safe7579Error('Invalid Safe7579InstallModuleConfig.callType')
				}
				moduleInitData = abiEncode(
					['bytes4', 'bytes1', 'bytes'],
					[config.functionSig, config.callType, config.initData],
				)
				break
			case ERC7579_MODULE_TYPE.HOOK:
				if (dataLength(config.hookType) !== 1) {
					throw new Safe7579Error('Invalid Safe7579InstallModuleConfig.hookType')
				}
				if (dataLength(config.selector) !== 4) {
					throw new Safe7579Error('Invalid Safe7579InstallModuleConfig.selector')
				}
				moduleInitData = abiEncode(
					['bytes1', 'bytes4', 'bytes'],
					[config.hookType, config.selector, config.initData],
				)
				break
		}
		return INTERFACES.ISafe7579.encodeFunctionData('installModule', [
			config.moduleType,
			config.moduleAddress,
			moduleInitData,
		])
	}

	static override encodeUninstallModule(config: Safe7579UninstallModuleConfig): string {
		if (!isHexString(config.deInitData)) {
			throw new Safe7579Error('Invalid Safe7579UninstallModuleConfig.deInitData')
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
		}

		return INTERFACES.ISafe7579.encodeFunctionData('uninstallModule', [
			config.moduleType,
			config.moduleAddress,
			moduleDeInitData,
		])
	}

	protected createError(message: string, cause?: Error) {
		return new Safe7579Error(message, cause)
	}
}

export class Safe7579Error extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'Safe7579Error'
	}
}

export type Safe7579InstallModuleConfig =
	| SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR>
	| SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR>
	| (SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
			functionSig: string // 4 bytes
			callType: CallType // 1 byte
	  })
	| (SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.HOOK> & {
			hookType: Safe7579HookType // 1 byte
			selector: string // 4 bytes
	  })

export enum Safe7579HookType {
	GLOBAL = '0x00',
	SIG = '0x01',
}

export type Safe7579UninstallModuleConfig =
	| (SimpleUninstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> & {
			prev: string // address
	  })
	| (SimpleUninstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR> & {
			prev: string // address
	  })
	| (SimpleUninstallModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
			functionSig: string // 4 bytes
	  })
	| SimpleUninstallModuleConfig<ERC7579_MODULE_TYPE.HOOK>
