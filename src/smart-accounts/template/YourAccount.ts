import type { Bundler, ERC7579Validator, Execution, PaymasterGetter, SendOpResult, UserOp } from '@/core'
import type { JsonRpcProvider } from 'ethers'
import { SmartAccount, type SmartAccountOptions } from '../SmartAccount'
import type { YourCreationOptions } from './types'

export type YourAccountOptions = SmartAccountOptions

export class YourAccount extends SmartAccount {
	static override accountId() {
		return ''
	}

	constructor(options: YourAccountOptions) {
		super(options)
	}

	override connect(address: string): SmartAccount {
		return this as any
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: YourCreationOptions) {
		return ''
	}

	getNonceKey() {
		return ''
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
