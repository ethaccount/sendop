import { ADDRESS } from '@/addresses'
import { TNexusFactory__factory } from '@/contract-types'
import { CallType, ERC7579_MODULE_TYPE } from '@/erc7579'
import { SendopError } from '@/error'
import { INTERFACES } from '@/interfaces'
import { abiEncode, sortAndUniquifyAddresses, zeroBytes } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { dataLength, isHexString } from 'ethers'
import { concat, hexlify } from 'ethers/utils'
import {
	ModularSmartAccount,
	type ModularSmartAccountOptions,
	type SimpleInstallModuleConfig,
	type SimpleUninstallModuleConfig,
} from '../ModularSmartAccount'
import { NexusValidationMode, type NexusCreationOptions } from './types'

export type NexusAccountOptions = ModularSmartAccountOptions & NexusAccountConfig

export type NexusAccountConfig = {
	nonce?: {
		mode?: NexusValidationMode // 1 byte
		validator?: string // 20 bytes
		key?: string // 3 bytes
	}
}

export class NexusAccount extends ModularSmartAccount<NexusCreationOptions> {
	private readonly _nexusConfig: NexusAccountConfig | undefined

	static override accountId() {
		return 'biconomy.nexus.1.0.2'
	}

	constructor(options: NexusAccountOptions) {
		super(options)
		const { nonce } = options
		this._nexusConfig = { nonce }
	}

	override connect(address: string): NexusAccount {
		return new NexusAccount({
			...this._options,
			address,
		})
	}

	static override getInitCode(creationOptions: NexusCreationOptions): string {
		const factoryCalldata = INTERFACES.NexusFactory.encodeFunctionData('createAccount', [
			NexusAccount.getInitializeData(creationOptions),
			creationOptions.salt,
		])
		return concat([ADDRESS.NexusFactory, factoryCalldata])
	}

	override getInitCode(creationOptions: NexusCreationOptions): string {
		return NexusAccount.getInitCode(creationOptions)
	}

	static override async computeAccountAddress(client: JsonRpcProvider, creationOptions: NexusCreationOptions) {
		const factory = TNexusFactory__factory.connect(ADDRESS.NexusFactory, client)
		const address = await factory.computeAccountAddress(
			this.getInitializeData(creationOptions),
			creationOptions.salt,
		)
		return address
	}

	override getNonceKey(): bigint {
		return BigInt(hexlify(this._getNonceKey(this._nexusConfig?.nonce)))
	}

	/**
	 * @dev [3 bytes empty][1 bytes validation mode][20 bytes validator][8 bytes nonce]
	 * @param options default value is { mode: KernelValidationMode.DEFAULT, type: KernelValidationType.ROOT, identifierWithoutType: this.validator.address(), key: zeroBytes(2) }
	 * @returns hex string
	 */
	private _getNonceKey(options?: { mode?: NexusValidationMode; validator?: string; key?: string }) {
		const defaultOptions = {
			mode: NexusValidationMode.VALIDATION,
			validator: this.validator.address(),
			key: zeroBytes(3),
		}
		const { mode, validator, key } = { ...defaultOptions, ...options }
		return concat([key, mode, validator])
	}

	/**
	 * @dev Nexus.initializeAccount's initData = abi.encode(bootstrap address, bootstrap calldata)
	 */
	static getInitializeData(creationOptions: NexusCreationOptions): string {
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
				throw new NexusError('Unsupported bootstrap function')
		}
		return abiEncode(['address', 'bytes'], [ADDRESS.NexusBootstrap, bootstrapCalldata])
	}

	static override encodeInstallModule(config: NexusInstallModuleConfig): string {
		if (!isHexString(config.initData)) {
			throw new NexusError('Invalid NexusInstallModuleConfig.initData')
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
					throw new NexusError('Invalid NexusInstallModuleConfig.functionSig')
				}
				if (dataLength(config.callType) !== 1) {
					throw new NexusError('Invalid NexusInstallModuleConfig.callType')
				}
				moduleInitData = concat([config.functionSig, config.callType, config.initData])
				break
			case ERC7579_MODULE_TYPE.HOOK:
				moduleInitData = config.initData
				break
			default:
				throw new NexusError('Invalid NexusInstallModuleConfig.moduleType')
		}
		return INTERFACES.Nexus.encodeFunctionData('installModule', [
			config.moduleType,
			config.moduleAddress,
			moduleInitData,
		])
	}

	static override encodeUninstallModule(config: NexusUninstallModuleConfig): string {
		if (!isHexString(config.deInitData)) {
			throw new NexusError('Invalid NexusUninstallModuleConfig.deInitData')
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

	protected createError(message: string, cause?: Error) {
		return new NexusError(message, cause)
	}
}

export class NexusError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'NexusError'
	}
}

export type NexusInstallModuleConfig =
	| SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR>
	| SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR>
	| (SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
			functionSig: string // 4 bytes
			callType: CallType // 1 byte
	  })
	| SimpleInstallModuleConfig<ERC7579_MODULE_TYPE.HOOK>

export type NexusUninstallModuleConfig =
	| (SimpleUninstallModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> & {
			prev: string // address
	  })
	| (SimpleUninstallModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR> & {
			prev: string // address
	  })
	| (SimpleUninstallModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
			selector: string // 4 bytes
	  })
	| SimpleUninstallModuleConfig<ERC7579_MODULE_TYPE.HOOK>
