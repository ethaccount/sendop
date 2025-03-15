import type { Bundler, ERC7579Validator, Execution, PaymasterGetter, SendOpResult, UserOp } from '@/core'
import type { JsonRpcProvider } from 'ethers'
import { SmartAccount } from '../SmartAccount'
import type { YourCreationOptions } from './types'

export type YourAccountOptions = {
	address?: string
	client: JsonRpcProvider
	bundler: Bundler
	erc7579Validator: ERC7579Validator
	pmGetter?: PaymasterGetter
}

export class YourAccount extends SmartAccount {
	private readonly _options: YourAccountOptions

	constructor(options: YourAccountOptions) {
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

	// interface

	get interface() {
		return YourAccount.interface
	}

	get factoryInterface() {
		return YourAccount.factoryInterface
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

	override getInitCode(creationOptions: any): string {
		return ''
	}

	override encodeInitialize(creationOptions: any): string {
		return ''
	}

	override encodeInstallModule(config: any): string {
		return ''
	}

	static readonly interface = ''
	static readonly factoryInterface = ''

	static override accountId() {
		return ''
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: YourCreationOptions) {
		return ''
	}
}
