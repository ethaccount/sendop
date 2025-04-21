import type { Execution, PaymasterGetter, SendOpResult } from '@/core'
import type { JsonRpcProvider } from 'ethers'
import { ModularSmartAccount, type ModularSmartAccountOptions } from '../ModularSmartAccount'
import { SendopError } from '@/error'

export type YourCreationOptions = {
	salt: string
	validatorAddress: string
	validatorInitData: string
}

export type YourAccountOptions = ModularSmartAccountOptions

export class YourAccount extends ModularSmartAccount {
	static override accountId() {
		return ''
	}

	constructor(options: YourAccountOptions) {
		super(options)
	}

	override connect(address: string): YourAccount {
		return new YourAccount({
			...this._options,
			address,
		})
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: YourCreationOptions) {
		return ''
	}

	override getInitCode(creationOptions: any): string {
		return ''
	}

	override getNonceKey(): bigint {
		return 0n
	}

	override encodeInstallModule(config: any): string {
		return ''
	}

	protected createError(message: string, cause?: Error): Error {
		return new YourAccountError(message, cause)
	}
}

export class YourAccountError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'YourAccountError'
	}
}
