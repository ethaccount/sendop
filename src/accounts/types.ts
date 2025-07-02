import type { Execution } from '@/types'
import type { Module } from '@/erc7579'
import type { BigNumberish } from 'ethers'
import type { UserOpBuilder } from 'ethers-erc4337'

export interface AccountAPI {
	new (): any
	sign1271(...args: any[]): Promise<string>
	getDeployment(...args: any[]): Promise<{
		factory: string
		factoryData: string
		accountAddress: string
	}>
	getNonceKey(...args: any[]): bigint
}

export interface AccountBuilder extends AccountValidation {
	getSender(): string
	getNonce(): Promise<BigNumberish>
	getCallData(executions: Execution[]): Promise<string>
	buildExecutions(executions: Execution[]): Promise<UserOpBuilder>
}

export interface AccountValidation {
	getDummySignature(): Promise<string>
	formatSignature(sig: string): Promise<string>
}

export interface ModularAccountBuilder extends AccountBuilder {
	buildModuleInstallation(module: Module): Promise<UserOpBuilder>
}
