import type { Execution, OperationGetter, PaymasterGetter, SendOpResult, UserOp } from '@/core'
import { SendopError } from '@/error'
import type { JsonRpcProvider } from 'ethers'

export abstract class SmartAccount implements OperationGetter {
	// OperationGetter interface
	abstract getSender(): Promise<string> | string
	abstract getNonce(): Promise<string> | string
	abstract getCallData(executions: Execution[]): Promise<string> | string
	abstract getDummySignature(userOp: UserOp): Promise<string> | string
	abstract getSignature(userOpHash: Uint8Array, userOp: UserOp): Promise<string> | string

	abstract connect(address: string): SmartAccount
	abstract deploy(creationOptions: any, pmGetter?: PaymasterGetter): Promise<SendOpResult>
	abstract send(executions: Execution[], pmGetter?: PaymasterGetter): Promise<SendOpResult>

	abstract getInitCode(creationOptions: any): string
	abstract encodeInstallModule(config: any): string

	// static
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
