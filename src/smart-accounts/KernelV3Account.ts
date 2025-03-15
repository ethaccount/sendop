import ADDRESS from '@/addresses'
import { KernelV3__factory, KernelV3Factory__factory } from '@/contract-types'
import type { Bundler, ERC7579Validator, Execution, PaymasterGetter, SendOpResult, UserOp } from '@/core'
import { ERC7579_MODULE_TYPE, sendop } from '@/core'
import { SendopError } from '@/error'
import { connectEntryPointV07 } from '@/utils/contract-helper'
import { abiEncode, is32BytesHexString, zeroBytes } from '@/utils/ethers-helper'
import { concat, Contract, isAddress, isHexString, JsonRpcProvider, toBeHex, ZeroAddress } from 'ethers'
import { SmartAccount } from './SmartAccount'

export enum KernelValidationMode {
	DEFAULT = '0x00',
	ENABLE = '0x01',
	INSTALL = '0x02',
}

export enum KernelValidationType {
	ROOT = '0x00',
	VALIDATOR = '0x01',
	PERMISSION = '0x02',
}

export type KernelCreationOptions = {
	salt: string
	validatorAddress: string
	validatorInitData: string
	hookAddress?: string
	hookData?: string
	initConfig?: string[]
}

type BaseModuleConfig<T extends ERC7579_MODULE_TYPE> = {
	moduleType: T
	moduleAddress: string
}

type ValidatorModuleConfig = BaseModuleConfig<ERC7579_MODULE_TYPE.VALIDATOR> & {
	hookAddress?: string
	validatorData: string
	hookData?: string
	selectorData?: string // 4 bytes
}

type ExecutorModuleConfig = BaseModuleConfig<ERC7579_MODULE_TYPE.EXECUTOR> & {
	hookAddress?: string
	executorData: string
	hookData?: string
}

type FallbackModuleConfig = BaseModuleConfig<ERC7579_MODULE_TYPE.FALLBACK> & {
	selector: string // 4 bytes
	hookAddress: string
	selectorData: string
	hookData: string
}

type SimpleModuleConfig<T extends ERC7579_MODULE_TYPE.HOOK> = BaseModuleConfig<T> & {
	initData: string
}

type ModuleConfig =
	| ValidatorModuleConfig
	| ExecutorModuleConfig
	| FallbackModuleConfig
	| SimpleModuleConfig<ERC7579_MODULE_TYPE.HOOK>

export class KernelV3Account extends SmartAccount {
	static override accountId() {
		return 'kernel.advanced.v0.3.1'
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: KernelCreationOptions) {
		const { salt, validatorAddress, validatorInitData, hookAddress, hookData, initConfig } = creationOptions

		if (!is32BytesHexString(salt)) {
			throw new KernelError('Salt should be 32 bytes in getNewAddress')
		}

		// Note: Since getAddress is also a method of BaseContract, special handling is required here
		const kernelFactory = new Contract(ADDRESS.KernelV3Factory, KernelV3Account.factoryInterface, client)
		const rootValidator = concat([KernelValidationType.VALIDATOR, validatorAddress])
		// assert rootValidator is 21 bytes
		if (!isHexString(rootValidator, 21)) {
			throw new KernelError('Invalid rootValidator')
		}

		const address = await kernelFactory['getAddress(bytes,bytes32)'](
			KernelV3Account.interface.encodeFunctionData('initialize', [
				rootValidator,
				hookAddress ?? ZeroAddress,
				validatorInitData,
				hookData ?? '0x',
				initConfig ?? [],
			]),
			salt,
		)

		if (!isAddress(address)) {
			throw new KernelError('Invalid address in getNewAddress')
		}

		return address
	}

	static readonly interface = KernelV3__factory.createInterface()
	static readonly factoryInterface = KernelV3Factory__factory.createInterface()

	readonly address: string
	readonly client: JsonRpcProvider
	readonly bundler: Bundler
	readonly erc7579Validator: ERC7579Validator
	readonly pmGetter?: PaymasterGetter
	readonly vType?: KernelValidationType

	constructor(
		address: string,
		options: {
			client: JsonRpcProvider
			bundler: Bundler
			erc7579Validator: ERC7579Validator
			pmGetter?: PaymasterGetter
			vType?: KernelValidationType
		},
	) {
		super()
		this.address = address
		this.client = options.client
		this.bundler = options.bundler
		this.erc7579Validator = options.erc7579Validator
		this.pmGetter = options.pmGetter
		this.vType = options.vType
	}

	interface() {
		return KernelV3Account.interface
	}

	factoryInterface() {
		return KernelV3Account.factoryInterface
	}

	async getSender() {
		return this.address
	}

	async getDummySignature(userOp: UserOp) {
		return this.erc7579Validator.getDummySignature(userOp)
	}

	async getSignature(userOpHash: Uint8Array, userOp: UserOp) {
		return this.erc7579Validator.getSignature(userOpHash, userOp)
	}

	async getNonce() {
		const nonce = await connectEntryPointV07(this.client).getNonce(this.address, this.getNonceKey())
		return toBeHex(nonce)
	}

	async getCustomNonce(options: {
		mode?: KernelValidationMode
		type?: KernelValidationType
		identifier?: string
		key?: string
	}) {
		const nonceKey = this.getNonceKey(options)
		return await connectEntryPointV07(this.client).getNonce(this.address, nonceKey)
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

	async send(executions: Execution[], pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		return await sendop({
			bundler: this.bundler,
			executions,
			opGetter: this,
			pmGetter: pmGetter ?? this.pmGetter,
		})
	}

	async deploy(creationOptions: KernelCreationOptions, pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		const deployingAddress = await KernelV3Account.getNewAddress(this.client, creationOptions)
		if (this.address !== deployingAddress) {
			throw new KernelError('deploying address mismatch')
		}

		return await sendop({
			bundler: this.bundler,
			executions: [],
			opGetter: this,
			pmGetter: pmGetter ?? this.pmGetter,
			initCode: this.getInitCode(creationOptions),
		})
	}

	/**
	 * @dev userOp.initCode = factory address + calldata to the factory
	 * @param creationOptions
	 * @returns
	 */
	getInitCode(creationOptions: KernelCreationOptions) {
		const { salt, validatorAddress, validatorInitData, hookAddress, hookData, initConfig } = creationOptions

		const rootValidator = concat([KernelValidationType.VALIDATOR, validatorAddress])
		if (!isHexString(rootValidator, 21)) {
			throw new KernelError('Invalid rootValidator')
		}
		const encodedInitializeCalldata = this.interface().encodeFunctionData('initialize', [
			rootValidator,
			hookAddress ?? ZeroAddress,
			validatorInitData,
			hookData ?? '0x',
			initConfig ?? [],
		])

		return concat([
			ADDRESS.KernelV3Factory,
			this.factoryInterface().encodeFunctionData('createAccount', [encodedInitializeCalldata, salt]),
		])
	}

	async getCallData(
		executions: Execution[],
		options: {
			execMode: string
		} = {
			execMode: '0x0100000000000000000000000000000000000000000000000000000000000000',
		},
	) {
		const { execMode } = options

		if (!executions.length) {
			return '0x'
		}

		// Execute 1 function directly on the smart account if it's the only one and to address is itself
		if (executions.length === 1 && executions[0].to == this.address) {
			return executions[0].data
		}

		const formattedExecutions = executions.map(execution => ({
			target: execution.to || '0x',
			value: BigInt(execution.value || '0x0'),
			data: execution.data || '0x',
		}))

		const encodedExecutions = abiEncode(
			['tuple(address,uint256,bytes)[]'],
			[formattedExecutions.map(execution => [execution.target, execution.value, execution.data])],
		)

		return this.interface().encodeFunctionData('execute', [execMode, encodedExecutions])
	}

	static encodeInstallModule(config: ModuleConfig): string {
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
				initData = (config as SimpleModuleConfig<ERC7579_MODULE_TYPE.HOOK>).initData
				break

			default:
				throw new KernelError('Unsupported module type')
		}

		return this.interface.encodeFunctionData('installModule', [config.moduleType, config.moduleAddress, initData])
	}

	/**
	 * @param hookAddress address
	 * @param validationData bytes
	 * @param hookData bytes
	 * @param selectorData bytes4 Specify which function selector the validator is allowed to use. It can be empty if you don't want to set any selector restrictions.
	 * @returns bytes
	 */
	static getInstallModuleInitData(
		hookAddress: string,
		validationData: string,
		hookData: string,
		selectorData: string,
	) {
		return abiEncode(['address', 'bytes', 'bytes', 'bytes4'], [hookAddress, validationData, hookData, selectorData])
	}

	async getUninstallModuleDeInitData() {
		return '0x'
	}
}

export class KernelError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'KernelError'
	}
}
