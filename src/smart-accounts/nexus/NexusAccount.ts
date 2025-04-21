import { ADDRESS } from '@/addresses'
import { NexusFactory__factory } from '@/contract-types'
import { ERC7579_MODULE_TYPE } from '@/core'
import { SendopError } from '@/error'
import { INTERFACES } from '@/interfaces'
import { abiEncode, zeroBytes, sortAndUniquifyAddresses } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { concat, hexlify } from 'ethers/utils'
import { ModularSmartAccount, type ModularSmartAccountOptions } from '../ModularSmartAccount'
import { NexusValidationMode, type NexusCreationOptions, type NexusInstallModuleConfig } from './types'

export type NexusAccountOptions = ModularSmartAccountOptions & NexusAccountConfig

export type NexusAccountConfig = {
	nonce?: {
		mode?: NexusValidationMode // 1 byte
		validator?: string // 20 bytes
		key?: string // 3 bytes
	}
}

export class NexusAccount extends ModularSmartAccount {
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

	/**
	 * @returns bytes: factory address + factory calldata
	 */
	override getInitCode(creationOptions: NexusCreationOptions): string {
		const factoryCalldata = INTERFACES.NexusFactory.encodeFunctionData('createAccount', [
			NexusAccount.getInitializeData(creationOptions),
			creationOptions.salt,
		])
		return concat([ADDRESS.NexusFactory, factoryCalldata])
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: NexusCreationOptions) {
		const factory = NexusFactory__factory.connect(ADDRESS.NexusFactory, client)
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
			// TODO: add other bootstrap functions
			default:
				throw new NexusError('Unsupported bootstrap function')
		}
		return abiEncode(['address', 'bytes'], [ADDRESS.NexusBootstrap, bootstrapCalldata])
	}

	override encodeInstallModule(config: NexusInstallModuleConfig): string {
		let initData: string
		switch (config.moduleType) {
			case ERC7579_MODULE_TYPE.VALIDATOR:
				initData = config.initData
				break
			// TODO: add other module types
			default:
				throw new NexusError('Unsupported module type')
		}
		return INTERFACES.Nexus.encodeFunctionData('installModule', [config.moduleType, config.moduleAddress, initData])
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
