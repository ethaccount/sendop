import type { Bundler, ERC7579Validator, Execution, PaymasterGetter, SendOpResult, UserOp } from '@/core'
import { sendop } from '@/core'
import { connectEntryPointV07 } from '@/utils/contract-getter'
import { SendopError } from '@/error'
import { abiEncode, is32BytesHexString, isSameAddress, padLeft } from '@/utils/ethers-helper'
import type { BytesLike } from 'ethers'
import { concat, Contract, hexlify, Interface, isAddress, JsonRpcProvider, toBeHex, ZeroAddress } from 'ethers'
import { SmartAccount } from './interface'

const KERNEL_FACTORY_ADDRESS = '0xaac5D4240AF87249B3f71BC8E4A2cae074A3E419'

export type KernelCreationOptions = {
	salt: string
	validatorAddress: string
	initData: BytesLike
}

export class Kernel extends SmartAccount {
	static override accountId() {
		return 'kernel.advanced.v0.3.1'
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: KernelCreationOptions) {
		const { salt, validatorAddress, initData } = creationOptions

		if (!is32BytesHexString(salt)) {
			throw new KernelError('Salt should be 32 bytes in getNewAddress')
		}

		const kernelFactory = new Contract(KERNEL_FACTORY_ADDRESS, this.kernelFactoryInterface, client)

		function getInitializeData(validator: string, initData: BytesLike) {
			if (!isAddress(validator)) {
				throw new KernelError('Invalid address in getInitializeData')
			}

			return Kernel.kernelInterface.encodeFunctionData('initialize', [
				concat(['0x01', validator]),
				ZeroAddress,
				initData,
				'0x',
				[],
			])
		}

		const address = await kernelFactory['getAddress(bytes,bytes32)'](
			getInitializeData(validatorAddress, initData),
			salt,
		)

		if (!isAddress(address)) {
			throw new KernelError('Invalid address in getNewAddress')
		}

		return address
	}

	static readonly kernelInterface = new Interface([
		'function initialize(bytes21 _rootValidator, address hook, bytes calldata validatorData, bytes calldata hookData, bytes[] calldata initConfig) external',
		'function execute(bytes32 execMode, bytes calldata executionCalldata)',
	])

	static readonly kernelFactoryInterface = new Interface([
		'function createAccount(bytes calldata data, bytes32 salt) public payable returns (address)',
		'function getAddress(bytes calldata data, bytes32 salt) public view returns (address)',
	])

	readonly address: string
	readonly client: JsonRpcProvider
	readonly bundler: Bundler
	readonly erc7579Validator: ERC7579Validator
	readonly pmGetter?: PaymasterGetter

	constructor(
		address: string,
		options: {
			client: JsonRpcProvider
			bundler: Bundler
			erc7579Validator: ERC7579Validator
			pmGetter?: PaymasterGetter
		},
	) {
		super()
		this.address = address
		this.client = options.client
		this.bundler = options.bundler
		this.erc7579Validator = options.erc7579Validator
		this.pmGetter = options.pmGetter
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
		const nonceKey = await this.getNonceKey(await this.erc7579Validator.address())
		const nonce = await connectEntryPointV07(this.client).getNonce(this.address, nonceKey)
		return toBeHex(nonce)
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
		const deployingAddress = await Kernel.getNewAddress(this.client, creationOptions)
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

	getInitCode(creationOptions: KernelCreationOptions) {
		const { salt, validatorAddress, initData } = creationOptions
		return concat([KERNEL_FACTORY_ADDRESS, this.getCreateAccountData(validatorAddress, initData, salt)])
	}

	private getCreateAccountData(validator: string, initData: BytesLike, salt: string) {
		if (!is32BytesHexString(salt)) {
			throw new KernelError('Salt should be 32 bytes in getCreateAccountData')
		}

		return this.kernelFactoryInterface().encodeFunctionData('createAccount', [
			this.getInitializeData(validator, initData),
			salt,
		])
	}

	private getInitializeData(validator: string, initData: BytesLike) {
		if (!isAddress(validator)) {
			throw new KernelError('Invalid address in getInitializeData')
		}

		return this.kernelInterface().encodeFunctionData('initialize', [
			concat(['0x01', validator]),
			ZeroAddress,
			initData,
			'0x',
			[],
		])
	}

	kernelInterface() {
		return Kernel.kernelInterface
	}

	kernelFactoryInterface() {
		return Kernel.kernelFactoryInterface
	}

	/**
	 * see kernel "function decodeNonce"
	 * 1byte mode  | 1byte type | 20bytes identifierWithoutType | 2byte nonceKey | 8byte nonce == 32bytes
	 */
	async getNonceKey(validator: string) {
		// TODO: custom nonce key when constructing kernel
		return concat(['0x00', '0x00', validator, '0x0000'])
	}

	async getCallData(executions: Execution[]) {
		if (!executions.length) {
			return '0x'
		}

		const execMode = '0x0100000000000000000000000000000000000000000000000000000000000000'

		// Execute functions other than 'execute' on the smart account
		if (executions.some(execution => execution.to == this.address)) {
			if (executions.length > 1) {
				throw new KernelError('Only one execution is allowed on the smart account')
			}
			return executions[0].data
		}

		const executionsData = executions.map(execution => ({
			target: execution.to || '0x',
			value: BigInt(execution.value || '0x0'),
			data: execution.data || '0x',
		}))

		const executionCalldata = abiEncode(
			['tuple(address,uint256,bytes)[]'],
			[executionsData.map(execution => [execution.target, execution.value, execution.data])],
		)

		return this.kernelInterface().encodeFunctionData('execute', [execMode, executionCalldata])
	}

	async getInstallModuleInitData(validationData: BytesLike) {
		const hook = ZeroAddress
		const validationLength = padLeft(hexlify(validationData))
		const validationOffset = padLeft('0x60')
		const hookLength = padLeft('0x0')
		const hookOffset = padLeft(toBeHex(BigInt(validationOffset) + BigInt(validationLength) + BigInt('0x20')))
		const selectorLength = padLeft('0x0')
		const selectorOffset = padLeft(toBeHex(BigInt(hookOffset) + BigInt('0x20')))

		return concat([
			hook,
			validationOffset,
			hookOffset,
			selectorOffset,
			validationLength,
			validationData,
			hookLength,
			selectorLength,
		])
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
