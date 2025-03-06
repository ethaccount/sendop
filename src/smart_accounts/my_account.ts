import {
	sendop,
	type Bundler,
	type ERC7579Validator,
	type Execution,
	type PaymasterGetter,
	type SendOpResult,
	type UserOp,
} from '@/core'
import { getEntryPointV07 } from '@/EntryPointV07'
import { SendopError } from '@/error'
import { abiEncode, padLeft } from '@/utils/ethers-helper'
import {
	concat,
	Contract,
	hexlify,
	Interface,
	isAddress,
	JsonRpcProvider,
	toBeHex,
	zeroPadValue,
	type BytesLike,
} from 'ethers'
import { SmartAccount } from './interface'
const MY_ACCOUNT_FACTORY_ADDRESS = '0xd4650238fcc60f64DfCa4e095dEe0081Dd4734b0'

type MyAccountCreationOptions = {
	salt: BytesLike
	validatorAddress: string
	owner: string
}

export class MyAccount extends SmartAccount {
	static override accountId() {
		return 'johnson86tw.0.0.1'
	}

	static override async getNewAddress(client: JsonRpcProvider, options: MyAccountCreationOptions) {
		const { salt, validatorAddress, owner } = options

		const myAccountFactory = new Contract(
			MY_ACCOUNT_FACTORY_ADDRESS,
			['function getAddress(uint256 salt, address validator, bytes calldata data) public view returns (address)'],
			client,
		)
		const address = await myAccountFactory['getAddress(uint256,address,bytes)'](salt, validatorAddress, owner)

		if (!isAddress(address)) {
			throw new MyAccountError('Failed to get new address in getNewAddress')
		}

		return address
	}

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
		const nonce = await getEntryPointV07(this.client).getNonce(this.address, nonceKey)
		return toBeHex(nonce)
	}

	async getNonceKey(validator: string) {
		return padLeft(validator, 24)
	}

	async send(executions: Execution[], pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		return await sendop({
			bundler: this.bundler,
			executions,
			opGetter: this,
			pmGetter: pmGetter ?? this.pmGetter,
		})
	}

	async deploy(creationOptions: MyAccountCreationOptions, pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		return await sendop({
			bundler: this.bundler,
			executions: [],
			opGetter: this,
			pmGetter: pmGetter ?? this.pmGetter,
			initCode: MyAccount.getInitCode(creationOptions),
		})
	}

	static getInitCode(creationOptions: MyAccountCreationOptions) {
		const { salt, validatorAddress, owner } = creationOptions

		return concat([
			MY_ACCOUNT_FACTORY_ADDRESS,
			new Interface([
				'function createAccount(uint256 salt, address validator, bytes calldata data)',
			]).encodeFunctionData('createAccount', [salt, validatorAddress, owner]),
		])
	}

	getInitCode(creationOptions: MyAccountCreationOptions) {
		return MyAccount.getInitCode(creationOptions)
	}

	async getCallData(executions: Execution[]) {
		if (!executions.length) {
			return '0x'
		}

		let callData

		// if one of the execution is to SA itself, it must be a single execution
		if (executions.some(execution => execution.to === this.address)) {
			if (executions.length > 1) {
				throw new MyAccountError(
					'If one of the execution is to SA itself, it must be a single execution in getCallData',
				)
			}

			callData = executions[0].data
		} else {
			/**
			 * ModeCode:
			 * |--------------------------------------------------------------------|
			 * | CALLTYPE  | EXECTYPE  |   UNUSED   | ModeSelector  |  ModePayload  |
			 * |--------------------------------------------------------------------|
			 * | 1 byte    | 1 byte    |   4 bytes  | 4 bytes       |   22 bytes    |
			 * |--------------------------------------------------------------------|
			 */
			const callType = executions.length > 1 ? '0x01' : '0x00'
			const modeCode = concat([
				callType,
				'0x00',
				'0x00000000',
				'0x00000000',
				'0x00000000000000000000000000000000000000000000',
			])

			const executionsData = executions.map(execution => ({
				target: execution.to || '0x',
				value: BigInt(execution.value || '0x0'),
				data: execution.data || '0x',
			}))

			let executionCalldata
			if (callType === '0x01') {
				// batch execution
				executionCalldata = abiEncode(
					['tuple(address,uint256,bytes)[]'],
					[executionsData.map(execution => [execution.target, execution.value, execution.data])],
				)
			} else {
				// single execution
				executionCalldata = concat([
					executionsData[0].target,
					zeroPadValue(toBeHex(executionsData[0].value), 32),
					executionsData[0].data,
				])
			}

			callData = new Interface([
				'function execute(bytes32 mode, bytes calldata executionCalldata)',
			]).encodeFunctionData('execute', [modeCode, executionCalldata])
		}

		if (!callData) {
			throw new MyAccountError('Failed to build callData in getCallData')
		}

		return callData
	}

	async getInstallModuleInitData(initData: BytesLike) {
		return hexlify(initData)
	}

	async getUninstallModuleDeInitData(
		accountAddress: string,
		clientUrl: string,
		uninstallModuleAddress: string,
	): Promise<string> {
		const myAccount = new Contract(
			accountAddress,
			[
				'function getValidatorsPaginated(address cursor, uint256 size) external view returns (address[] memory array, address next)',
			],
			new JsonRpcProvider(clientUrl),
		)

		const validators = await myAccount.getValidatorsPaginated(padLeft('0x1', 20), 5)
		const prev = findPrevious(validators.array, uninstallModuleAddress)
		function findPrevious(array: string[], entry: string): string {
			for (let i = 0; i < array.length; i++) {
				if (array[i].toLowerCase() === entry.toLowerCase()) {
					if (i === 0) {
						return padLeft('0x1', 20)
					} else {
						return array[i - 1]
					}
				}
			}
			throw new MyAccountError('Entry not found in array in getUninstallModuleDeInitData')
		}

		const deInitData = abiEncode(['address', 'bytes'], [prev, '0x'])

		return deInitData
	}
}

export class MyAccountError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'MyAccountError'
	}
}
