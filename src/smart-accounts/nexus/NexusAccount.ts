import ADDRESS from '@/addresses'
import { NexusFactory__factory } from '@/contract-types'
import {
	CallType,
	encodeExecution,
	encodeExecutions,
	ERC7579_MODULE_TYPE,
	ExecType,
	ModeSelector,
	sendop,
	type Bundler,
	type ERC7579Validator,
	type Execution,
	type PaymasterGetter,
	type SendOpResult,
	type UserOp,
} from '@/core'
import { SendopError } from '@/error'
import INTERFACES from '@/interfaces'
import { abiEncode, connectEntryPointV07, zeroBytes } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { concat, toBeHex } from 'ethers/utils'
import { NoAddressAccountError, SmartAccount } from '../SmartAccount'
import { NexusValidationMode, type NexusCreationOptions, type NexusInstallModuleConfig } from './types'

export type NexusAccountOptions = {
	address?: string
	client: JsonRpcProvider
	bundler: Bundler
	erc7579Validator: ERC7579Validator
	pmGetter?: PaymasterGetter
	config?: {
		callType?: CallType
		execType?: ExecType
		modeSelector?: ModeSelector
		modePayload?: string
	}
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

	override async getSender() {
		if (!this.address) {
			throw new NoAddressAccountError()
		}
		return this.address
	}

	override async getNonce() {
		const nonce = await connectEntryPointV07(this.client).getNonce(this.getSender(), this.getNonceKey())
		return toBeHex(nonce)
	}

	async getCustomNonce(options: { mode?: NexusValidationMode; validator?: string; key?: string }) {
		const nonce = await connectEntryPointV07(this.client).getNonce(this.getSender(), this.getNonceKey(options))
		return toBeHex(nonce)
	}

	/**
	 * @dev [3 bytes empty][1 bytes validation mode][20 bytes validator][8 bytes nonce]
	 * @param options default value is { mode: KernelValidationMode.DEFAULT, type: KernelValidationType.ROOT, identifierWithoutType: this.erc7579Validator.address(), key: zeroBytes(2) }
	 * @returns hex string
	 */
	getNonceKey(options?: { mode?: NexusValidationMode; validator?: string; key?: string }) {
		const defaultOptions = {
			mode: NexusValidationMode.VALIDATION,
			validator: this.erc7579Validator.address(),
			key: zeroBytes(3),
		}
		const { mode, validator, key } = { ...defaultOptions, ...options }
		return concat([key, mode, validator])
	}

	///
	/// |--------------------------------------------------------------------|
	/// | CALLTYPE  | EXECTYPE  |   UNUSED   | ModeSelector  |  ModePayload  |
	/// |--------------------------------------------------------------------|
	/// | 1 byte    | 1 byte    |   4 bytes  | 4 bytes       |   22 bytes    |
	/// |--------------------------------------------------------------------|
	///
	override getCallData(executions: Execution[]): Promise<string> | string {
		if (!executions.length) {
			return '0x'
		}

		// Execute 1 function directly on the smart account if it's the only one and to address is itself
		if (executions.length === 1 && executions[0].to == this.address) {
			return executions[0].data
		}

		const defaultExecutionMode = {
			callType: CallType.BATCH,
			execType: ExecType.DEFAULT,
			modeSelector: ModeSelector.DEFAULT,
			modePayload: zeroBytes(22),
		}
		let { callType, execType, modeSelector, modePayload } = { ...defaultExecutionMode, ...this._options.config }

		// If there is only one execution, set callType to SIGNLE
		if (executions.length === 1) {
			callType = CallType.SIGNLE
		}
		const execMode = concat([callType, execType, modeSelector, modePayload])

		switch (callType) {
			case CallType.SIGNLE:
				return this.interface.encodeFunctionData('execute', [execMode, encodeExecution(executions[0])])
			case CallType.BATCH:
				return this.interface.encodeFunctionData('execute', [execMode, encodeExecutions(executions)])
			default:
				throw new NexusError('Unsupported call type')
		}
	}

	override async getDummySignature(userOp: UserOp) {
		return this.erc7579Validator.getDummySignature(userOp)
	}

	override async getSignature(userOpHash: Uint8Array, userOp: UserOp) {
		return this.erc7579Validator.getSignature(userOpHash, userOp)
	}

	override connect(address: string): NexusAccount {
		return new NexusAccount({
			...this._options,
			address,
		})
	}

	override async deploy(creationOptions: NexusCreationOptions, pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		const computedAddress = await NexusAccount.getNewAddress(this.client, creationOptions)
		return await sendop({
			bundler: this.bundler,
			executions: [],
			opGetter: this.connect(computedAddress),
			pmGetter: pmGetter ?? this.pmGetter,
			initCode: this.getInitCode(creationOptions),
		})
	}

	override async send(executions: Execution[], pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		return await sendop({
			bundler: this.bundler,
			executions,
			opGetter: this,
			pmGetter: pmGetter ?? this.pmGetter,
		})
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
