import ADDRESS from '@/addresses'
import type { Bundler, ERC7579Validator, Execution, PaymasterGetter, SendOpResult, UserOp } from '@/core'
import { encodeExecutions, ERC7579_MODULE_TYPE, sendop } from '@/core'
import { SendopError } from '@/error'
import INTERFACES from '@/interfaces'
import { abiEncode, connectEntryPointV07, isBytes, isBytes32, zeroBytes } from '@/utils'
import { concat, Contract, JsonRpcProvider, toBeHex, ZeroAddress } from 'ethers'
import { NoAddressAccountError, SmartAccount } from '../SmartAccount'
import type { KernelCreationOptions, KernelInstallModuleConfig, SimpleKernelInstallModuleConfig } from './types'
import { KernelValidationMode, KernelValidationType } from './types'

export type KernelV3AccountOptions = {
	client: JsonRpcProvider
	bundler: Bundler
	erc7579Validator: ERC7579Validator
	address?: string
	pmGetter?: PaymasterGetter
	vType?: KernelValidationType
	execMode?: string // TODO: what's this?
}

export class KernelV3Account extends SmartAccount {
	private readonly _options: KernelV3AccountOptions

	constructor(options: KernelV3AccountOptions) {
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

	get vType(): KernelValidationType | undefined {
		return this._options.vType
	}

	get execMode(): string {
		return this._options.execMode ?? '0x0100000000000000000000000000000000000000000000000000000000000000'
	}

	get interface() {
		return KernelV3Account.interface
	}

	get factoryInterface() {
		return KernelV3Account.factoryInterface
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

	async getCustomNonce(options: {
		mode?: KernelValidationMode
		type?: KernelValidationType
		identifier?: string
		key?: string
	}) {
		const nonce = await connectEntryPointV07(this.client).getNonce(this.getSender(), this.getNonceKey(options))
		return toBeHex(nonce)
	}

	/**
	 * @dev 1byte mode  | 1byte type | 20bytes identifierWithoutType | 2byte nonceKey = 24 bytes nonceKey
	 * @param options default value is { mode: KernelValidationMode.DEFAULT, type: KernelValidationType.ROOT, identifierWithoutType: this.erc7579Validator.address(), key: zeroBytes(2) }
	 * @returns hex string
	 */
	getNonceKey(options?: {
		mode?: KernelValidationMode
		type?: KernelValidationType
		identifier?: string
		key?: string
	}) {
		const defaultOptions = {
			mode: KernelValidationMode.DEFAULT,
			type: this.vType ?? KernelValidationType.ROOT,
			identifier: this.erc7579Validator.address(),
			key: zeroBytes(2),
		}
		const { mode, type, identifier, key } = { ...defaultOptions, ...options }
		return concat([mode, type, identifier, key])
	}

	override async getCallData(executions: Execution[]) {
		if (!executions.length) {
			return '0x'
		}

		// Execute 1 function directly on the smart account if it's the only one and to address is itself
		if (executions.length === 1 && executions[0].to == this.address) {
			return executions[0].data
		}
		return this.interface.encodeFunctionData('execute', [this.execMode, encodeExecutions(executions)])
	}

	override async getDummySignature(userOp: UserOp) {
		return this.erc7579Validator.getDummySignature(userOp)
	}

	override async getSignature(userOpHash: Uint8Array, userOp: UserOp) {
		return this.erc7579Validator.getSignature(userOpHash, userOp)
	}

	override connect(address: string): KernelV3Account {
		return new KernelV3Account({
			...this._options,
			address,
		})
	}

	override async deploy(creationOptions: KernelCreationOptions, pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		const computedAddress = await KernelV3Account.getNewAddress(this.client, creationOptions)
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

	override getInitCode(creationOptions: KernelCreationOptions) {
		return KernelV3Account.getInitCode(creationOptions)
	}

	encodeInitialize(creationOptions: KernelCreationOptions) {
		return KernelV3Account.encodeInitialize(creationOptions)
	}

	override encodeInstallModule(config: KernelInstallModuleConfig) {
		return KernelV3Account.encodeInstallModule(config)
	}

	// ================================ static ================================

	static readonly interface = INTERFACES.KernelV3
	static readonly factoryInterface = INTERFACES.KernelV3Factory

	static override accountId() {
		return 'kernel.advanced.v0.3.1'
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: KernelCreationOptions) {
		const { salt } = creationOptions
		if (!isBytes32(salt)) {
			throw new KernelError('Invalid salt')
		}
		// Note: since getAddress is also a method of BaseContract, special handling is required here
		const kernelFactory = new Contract(ADDRESS.KernelV3Factory, KernelV3Account.factoryInterface, client)
		return await kernelFactory['getAddress(bytes,bytes32)'](KernelV3Account.encodeInitialize(creationOptions), salt)
	}

	static getInitCode(creationOptions: KernelCreationOptions) {
		const { salt } = creationOptions
		if (!isBytes32(salt)) {
			throw new KernelError('Invalid salt')
		}
		return concat([
			ADDRESS.KernelV3Factory,
			this.factoryInterface.encodeFunctionData('createAccount', [
				KernelV3Account.encodeInitialize(creationOptions),
				salt,
			]),
		])
	}

	static encodeInitialize(creationOptions: KernelCreationOptions) {
		const { validatorAddress, validatorInitData, hookAddress, hookData, initConfig } = creationOptions

		const rootValidator = concat([KernelValidationType.VALIDATOR, validatorAddress])
		if (!isBytes(rootValidator, 21)) {
			throw new KernelError('Invalid rootValidator')
		}
		return this.interface.encodeFunctionData('initialize', [
			rootValidator,
			hookAddress ?? ZeroAddress,
			validatorInitData,
			hookData ?? '0x',
			initConfig ?? [],
		])
	}

	static encodeInstallModule(config: KernelInstallModuleConfig): string {
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
						abiEncode(['bytes', 'bytes', 'bytes'], [config.validatorData, hookData, selectorData]),
					])
				}
				break

			case ERC7579_MODULE_TYPE.EXECUTOR:
				{
					// default values
					const hookAddress = config.hookAddress ?? ZeroAddress
					const hookData = config.hookData ?? '0x'
					initData = concat([hookAddress, abiEncode(['bytes', 'bytes'], [config.executorData, hookData])])
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
				initData = (config as SimpleKernelInstallModuleConfig<ERC7579_MODULE_TYPE.HOOK>).initData
				break

			default:
				throw new KernelError('Unsupported module type')
		}

		return this.interface.encodeFunctionData('installModule', [config.moduleType, config.moduleAddress, initData])
	}
}

export class KernelError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'KernelError'
	}
}
