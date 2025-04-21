import type { Execution, PaymasterGetter, SendOpResult } from '@/core'
import type { JsonRpcProvider } from 'ethers'
import { ModularSmartAccount, type ModularSmartAccountOptions } from '../ModularSmartAccount'

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

	override connect(address: string): ModularSmartAccount {
		return new YourAccount({
			...this._options,
			address,
		})
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: YourCreationOptions) {
		return ''
	}

	override getNonceKey(): bigint {
		return 0n
	}

	override getCallData(executions: Execution[]): Promise<string> | string {
		return ''
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

	override encodeInstallModule(config: any): string {
		return ''
	}
}
