import { ADDRESS } from '@/addresses'
import { CallType, encodeExecutions, ERC7579_MODULE_TYPE, ExecType, ModeSelector, type Execution } from '@/core'
import { SendopError } from '@/error'
import { INTERFACES } from '@/interfaces'
import { abiEncode, connectEntryPointV07, isBytes, isBytes32, toBytes32, zeroBytes } from '@/utils'
import { concat, Contract, JsonRpcProvider, toBeHex, ZeroAddress } from 'ethers'
import { SmartAccount, type SmartAccountOptions } from '../SmartAccount'
import type { KernelCreationOptions, KernelInstallModuleConfig, SimpleKernelInstallModuleConfig } from './types'
import { KernelValidationMode, KernelValidationType } from './types'

export type KernelV3AccountOptions = SmartAccountOptions & KernelV3AccountConfig

export type KernelV3AccountConfig = {
	nonce?: {
		mode?: KernelValidationMode
		type?: KernelValidationType
		identifier?: string
		key?: string
	}
	execMode?: {
		callType?: CallType // 1 byte
		execType?: ExecType // 1 byte
		unused?: string // 4 bytes
		modeSelector?: ModeSelector // 4 bytes
		modePayload?: string // 22 bytes
	}
}

export class KernelV3Account extends SmartAccount {
	private readonly _kernelConfig: KernelV3AccountConfig | undefined

	static override accountId() {
		return 'kernel.advanced.v0.3.1'
	}
	static readonly interface = INTERFACES.KernelV3
	static readonly factoryInterface = INTERFACES.KernelV3Factory
	get interface() {
		return KernelV3Account.interface
	}
	get factoryInterface() {
		return KernelV3Account.factoryInterface
	}

	constructor(options: KernelV3AccountOptions) {
		super(options)
		this._kernelConfig = { ...options }
	}

	override connect(address: string): KernelV3Account {
		return new KernelV3Account({
			...this._options,
			address,
		})
	}

	override getInitCode(creationOptions: KernelCreationOptions): string {
		return KernelV3Account.getInitCode(creationOptions)
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

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: KernelCreationOptions) {
		const { salt } = creationOptions
		if (!isBytes32(salt)) {
			throw new KernelError('Invalid salt')
		}
		const kernelFactory = new Contract(ADDRESS.KernelV3Factory, KernelV3Account.factoryInterface, client)
		return await kernelFactory['getAddress(bytes,bytes32)'](KernelV3Account.encodeInitialize(creationOptions), salt)
	}

	override async getNonce() {
		const nonce = await connectEntryPointV07(this.client).getNonce(
			this.getSender(),
			this.getNonceKey(this._kernelConfig?.nonce),
		)
		return toBeHex(nonce)
	}

	async getCustomNonce(options: {
		mode?: KernelValidationMode
		type?: KernelValidationType
		identifier?: string
		key?: string
	}) {
		const nonce = await connectEntryPointV07(this.client).getNonce(
			this.getSender(),
			this.getNonceKey({
				...this._kernelConfig?.nonce,
				...options,
			}),
		)
		return toBeHex(nonce)
	}

	/**
	 * @dev 1byte mode  | 1byte type | 20bytes identifierWithoutType | 2byte nonceKey = 24 bytes nonceKey
	 * @param options default value is { mode: KernelValidationMode.DEFAULT, type: KernelValidationType.ROOT, identifierWithoutType: this.validator.address(), key: zeroBytes(2) }
	 * @returns hex string
	 */
	override getNonceKey(options?: {
		mode?: KernelValidationMode
		type?: KernelValidationType
		identifier?: string
		key?: string
	}): string {
		const defaultOptions = {
			mode: KernelValidationMode.DEFAULT,
			type: KernelValidationType.ROOT,
			identifier: this.validator.address(),
			key: zeroBytes(2),
		}
		const { mode, type, identifier, key } = { ...defaultOptions, ...options }
		return concat([mode, type, identifier, key])
	}

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
			unused: zeroBytes(4),
			modeSelector: ModeSelector.DEFAULT,
			modePayload: zeroBytes(22),
		}
		let { callType, execType, modeSelector, modePayload, unused } = {
			...defaultExecutionMode,
			...this._kernelConfig?.execMode,
		}

		// If there is only one execution, set callType to SIGNLE
		if (executions.length === 1) {
			callType = CallType.SIGNLE
		}
		/// |--------------------------------------------------------------------|
		/// | CALLTYPE  | EXECTYPE  |   UNUSED   | ModeSelector  |  ModePayload  |
		/// |--------------------------------------------------------------------|
		/// | 1 byte    | 1 byte    |   4 bytes  | 4 bytes       |   22 bytes    |
		/// |--------------------------------------------------------------------|
		if (!isBytes(callType, 1)) throw new KernelError(`invalid callType ${callType}`)
		if (!isBytes(execType, 1)) throw new KernelError(`invalid execType ${execType}`)
		if (!isBytes(unused, 4)) throw new KernelError(`invalid unused ${unused}`)
		if (!isBytes(modeSelector, 4)) throw new KernelError(`invalid modeSelector ${modeSelector}`)
		if (!isBytes(modePayload, 22)) throw new KernelError(`invalid modePayload ${modePayload}`)
		const execMode = concat([callType, execType, unused, modeSelector, modePayload])

		switch (callType) {
			case CallType.SIGNLE:
				return this.interface.encodeFunctionData('execute', [
					execMode,
					// decodeSingle is address (20) + value (32) + data (bytes) without abi.encode
					concat([executions[0].to, toBytes32(executions[0].value), executions[0].data]),
				])
			case CallType.BATCH:
				return this.interface.encodeFunctionData('execute', [execMode, encodeExecutions(executions)])
			default:
				throw new KernelError('unsupported call type')
		}
	}

	encodeInitialize(creationOptions: KernelCreationOptions) {
		return KernelV3Account.encodeInitialize(creationOptions)
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

	override encodeInstallModule(config: KernelInstallModuleConfig): string {
		return KernelV3Account.encodeInstallModule(config)
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
