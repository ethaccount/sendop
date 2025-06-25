import { ADDRESS } from '@/addresses'
import type {
	Bundler,
	Execution,
	OperationGetter,
	PaymasterGetter,
	SendOpResult,
	SignatureData,
	UserOperation,
} from '@/core'
import { sendop } from '@/core'
import { SendopError, UnsupportedEntryPointError } from '@/error'
import { connectEntryPointV07, connectEntryPointV08 } from '@/utils'
import { type JsonRpcProvider } from 'ethers'

export type SmartAccountOptions = {
	address?: string
	client: JsonRpcProvider
	bundler: Bundler
	pmGetter?: PaymasterGetter
}

export type SmartAccountCreationOptions = Record<string, any>

export abstract class SmartAccount<TCreationOptions extends SmartAccountCreationOptions> implements OperationGetter {
	protected readonly _options: SmartAccountOptions

	constructor(options: SmartAccountOptions) {
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

	get pmGetter(): PaymasterGetter | undefined {
		return this._options.pmGetter
	}

	async getSender(): Promise<string> {
		if (!this.address) {
			throw this.createError(
				'SmartAccount.getSender failed. Account has no address, set it in the constructor options or call SmartAccount.connect(address) first',
			)
		}
		return this.address
	}

	async getNonce(): Promise<bigint> {
		switch (this.bundler.entryPointAddress) {
			case ADDRESS.EntryPointV07:
				return await connectEntryPointV07(this.client).getNonce(await this.getSender(), this.getNonceKey())
			case ADDRESS.EntryPointV08:
				return await connectEntryPointV08(this.client).getNonce(await this.getSender(), this.getNonceKey())
			default:
				throw this.createError(
					'getNonce failed',
					new UnsupportedEntryPointError(this.bundler.entryPointAddress),
				)
		}
	}

	async send(executions: Execution[], options?: { pmGetter?: PaymasterGetter }): Promise<SendOpResult> {
		return await sendop({
			bundler: this.bundler,
			executions,
			opGetter: this,
			pmGetter: options?.pmGetter ?? this.pmGetter,
		})
	}

	async deploy(
		creationOptions: TCreationOptions,
		options?: {
			pmGetter?: PaymasterGetter
			executions?: Execution[]
		},
	): Promise<SendOpResult> {
		const computedAddress = await (this.constructor as typeof SmartAccount).computeAccountAddress(
			this.client,
			creationOptions,
		)
		return await sendop({
			bundler: this.bundler,
			executions: options?.executions ?? [],
			opGetter: this.connect(computedAddress),
			pmGetter: options?.pmGetter ?? this.pmGetter,
			initCode: this.getInitCode(creationOptions),
		})
	}

	// Abstract methods that need to be implemented by specific accounts
	abstract getNonceKey(): bigint
	abstract getCallData(executions: Execution[]): Promise<string> | string
	abstract connect(address: string): SmartAccount<TCreationOptions>
	abstract getInitCode(creationOptions: TCreationOptions): string
	abstract getDummySignature(userOp: UserOperation): Promise<string> | string
	abstract getSignature(signatureData: SignatureData): Promise<string> | string

	// Static methods
	static accountId(): string {
		throw new SendopError('SmartAccount.accountId is not implemented')
	}

	static async computeAccountAddress(client: JsonRpcProvider, creationOptions: any): Promise<string> {
		throw new SendopError('SmartAccount.computeAccountAddress is not implemented')
	}

	static getInitCode(creationOptions: any): string {
		throw new SendopError('SmartAccount.getInitCode is not implemented')
	}

	protected abstract createError(message: string, cause?: Error): Error
}
