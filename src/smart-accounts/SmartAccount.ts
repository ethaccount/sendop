import type { Bundler, Execution, OperationGetter, PaymasterGetter, SendOpResult, SignatureData, UserOp } from '@/core'
import { sendop } from '@/core'
import { SendopError } from '@/error'
import { connectEntryPointV07 } from '@/utils'
import { type JsonRpcProvider } from 'ethers'

export type SmartAccountOptions = {
	address?: string
	client: JsonRpcProvider
	bundler: Bundler
	pmGetter?: PaymasterGetter
}

export abstract class SmartAccount implements OperationGetter {
	protected readonly _options: SmartAccountOptions

	constructor(options: SmartAccountOptions) {
		this._options = options
	}

	// Common getters
	get address(): string | undefined {
		return this._options.address
	}

	get client(): JsonRpcProvider {
		return this._options.client
	}

	get bundler(): Bundler {
		return this._options.bundler
	}

	get pmGetter(): PaymasterGetter | undefined {
		return this._options.pmGetter
	}

	async getSender(): Promise<string> {
		if (!this.address) {
			throw new NoAddressAccountError()
		}
		return this.address
	}

	async getNonce(): Promise<bigint> {
		return await connectEntryPointV07(this.client).getNonce(await this.getSender(), this.getNonceKey())
	}

	async send(executions: Execution[], pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		return await sendop({
			bundler: this.bundler,
			executions,
			opGetter: this,
			pmGetter: pmGetter ?? this.pmGetter,
		})
	}

	async deploy(creationOptions: any, pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		const computedAddress = await (this.constructor as typeof SmartAccount).getNewAddress(
			this.client,
			creationOptions,
		)
		return await sendop({
			bundler: this.bundler,
			executions: [],
			opGetter: this.connect(computedAddress),
			pmGetter: pmGetter ?? this.pmGetter,
			initCode: this.getInitCode(creationOptions),
		})
	}

	// Abstract methods that need to be implemented by specific accounts
	abstract getNonceKey(): bigint
	abstract getCallData(executions: Execution[]): Promise<string> | string
	abstract connect(address: string): SmartAccount
	abstract getInitCode(creationOptions: any): string
	abstract getDummySignature(userOp: UserOp): Promise<string> | string
	abstract getSignature(signatureData: SignatureData): Promise<string> | string

	// Static methods
	static accountId(): string {
		throw new NoImplementationError('accountId')
	}

	static async getNewAddress(client: JsonRpcProvider, creationOptions: any): Promise<string> {
		throw new NoImplementationError('getNewAddress')
	}
}

export class NoImplementationError extends SendopError {
	constructor(functionName: string) {
		super(`static method - ${functionName} is not implemented`)
		this.name = 'NoImplementationError'
	}
}

export class NoAddressAccountError extends SendopError {
	constructor(cause?: Error) {
		super('account has no address, set it in the constructor options or call connect(address) first', cause)
		this.name = 'NoAddressAccountError'
	}
}
