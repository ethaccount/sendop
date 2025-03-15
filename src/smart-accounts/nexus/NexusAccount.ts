import ADDRESS from '@/addresses'
import { NexusFactory__factory } from '@/contract-types'
import {
	ERC7579_MODULE_TYPE,
	type Bundler,
	type ERC7579Validator,
	type Execution,
	type PaymasterGetter,
	type SendOpResult,
	type UserOp,
} from '@/core'
import { SendopError } from '@/error'
import INTERFACES from '@/interfaces'
import { abiEncode } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { concat } from 'ethers/utils'
import { SmartAccount } from '../SmartAccount'
import type { NexusCreationOptions, NexusInstallModuleConfig } from './types'

export type NexusAccountOptions = {
	address?: string
	client: JsonRpcProvider
	bundler: Bundler
	erc7579Validator: ERC7579Validator
	pmGetter?: PaymasterGetter
}

export class NexusAccount extends SmartAccount {
	private readonly _options: NexusAccountOptions

	constructor(options: NexusAccountOptions) {
		super()
		this._options = options
	}

	get address(): string | undefined {
		return this._options.address
	}

	get client(): JsonRpcProvider {
		return this._options.client
	}

	get bundler(): Bundler {
		return this._options.bundler
	}

	get erc7579Validator(): ERC7579Validator {
		return this._options.erc7579Validator
	}

	get pmGetter(): PaymasterGetter | undefined {
		return this._options.pmGetter
	}

	override getSender(): Promise<string> | string {
		return ''
	}
	override getNonce(): Promise<string> | string {
		return ''
	}
	override getCallData(executions: Execution[]): Promise<string> | string {
		return ''
	}
	override getDummySignature(userOp: UserOp): Promise<string> | string {
		return ''
	}
	override getSignature(userOpHash: Uint8Array, userOp: UserOp): Promise<string> | string {
		return ''
	}

	override connect(address: string): SmartAccount {
		return this
	}
	override async deploy(creationOptions: any, pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		return '' as any
	}
	override send(executions: Execution[], pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		return '' as any
	}

	/**
	 * @returns op.initCode = factory address + factory calldata
	 */
	override getInitCode(creationOptions: NexusCreationOptions): string {
		const factoryCalldata = this.factoryInterface.encodeFunctionData('createAccount', [
			this.encodeInitialize(creationOptions),
			creationOptions.salt,
		])
		return concat([ADDRESS.NexusFactory, factoryCalldata])
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: NexusCreationOptions) {
		const factory = NexusFactory__factory.connect(ADDRESS.NexusFactory, client)
		const address = await factory.computeAccountAddress(
			this.encodeInitialize(creationOptions),
			creationOptions.salt,
		)
		return address
	}

	override encodeInitialize(creationOptions: NexusCreationOptions): string {
		return NexusAccount.encodeInitialize(creationOptions)
	}
	static encodeInitialize(creationOptions: NexusCreationOptions): string {
		// initializeAccount's initData = abi.encode(bootstrap address, bootstrap calldata)
		let bootstrapCalldata: string
		switch (creationOptions.bootstrap) {
			case 'initNexusWithSingleValidator':
				bootstrapCalldata = this.bootstrapInterface.encodeFunctionData('initNexusWithSingleValidator', [
					creationOptions.validatorAddress,
					creationOptions.validatorInitData,
					creationOptions.registryAddress,
					creationOptions.attesters,
					creationOptions.threshold,
				])
				break
			// TODO: add other bootstrap functions
			default:
				throw new NexusError('Unsupported bootstrap function')
		}
		const initData = abiEncode(['address', 'bytes'], [ADDRESS.NexusBootstrap, bootstrapCalldata])
		return this.interface.encodeFunctionData('initializeAccount', [initData])
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
		return this.interface.encodeFunctionData('installModule', [config.moduleType, config.moduleAddress, initData])
	}

	static override accountId() {
		return 'biconomy.nexus.1.0.2'
	}

	// ================================== interfaces ==================================

	static readonly interface = INTERFACES.Nexus
	static readonly factoryInterface = INTERFACES.NexusFactory
	static readonly bootstrapInterface = INTERFACES.NexusBootstrap
	get interface() {
		return NexusAccount.interface
	}
	get factoryInterface() {
		return NexusAccount.factoryInterface
	}
	get bootstrapInterface() {
		return NexusAccount.bootstrapInterface
	}
}

export class NexusError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'NexusError'
	}
}
