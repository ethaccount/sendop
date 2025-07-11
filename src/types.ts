import type { JsonRpcProvider } from 'ethers'

export type Execution = {
	to: string
	data: string
	value: bigint
}

export interface PaymasterAPI {
	getPaymaster(): Promise<string>
	getPaymasterData(): Promise<string>
	getPaymasterPostOpGasLimit(): Promise<bigint>
}

export interface ValidationAPI {
	getDummySignature(): Promise<string>
	formatSignature(sig: string): Promise<string>
	format1271Signature?(sig: string): Promise<string>
}

export interface AccountAPI extends ValidationAPI {
	entryPointAddress: string
	getNonce(client: JsonRpcProvider, address: string): Promise<bigint>
	getCallData(executions: Execution[]): Promise<string>
}

export abstract class AbstractModularAccount implements AccountAPI {
	public abstract entryPointAddress: string

	protected validation: ValidationAPI

	constructor(validation: ValidationAPI) {
		this.validation = validation
	}

	abstract getNonce(client: JsonRpcProvider, address: string): Promise<bigint>
	abstract getCallData(executions: Execution[]): Promise<string>

	async getDummySignature(): Promise<string> {
		return this.validation.getDummySignature()
	}

	async formatSignature(sig: string): Promise<string> {
		return await this.validation.formatSignature(sig)
	}
}
