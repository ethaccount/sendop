import type { Execution } from '@/core'
import type { Module } from '@/modules/types'
import type { BigNumberish } from 'ethers'
import type { UserOpBuilder } from 'ethers-erc4337'

export interface AccountStaticAPI {
	computeAddress(...args: any[]): Promise<{
		factory: string
		factoryData: string
		accountAddress: string
	}>
	getNonceKey(...args: any[]): bigint
	signERC1271(...args: any[]): Promise<string>
}

export interface AccountAPI extends ValidationAPI {
	getSender(): string
	getNonce(): Promise<BigNumberish>
	getCallData(executions: Execution[]): Promise<string>
	buildExecution(executions: Execution[]): Promise<UserOpBuilder>

	// optional
	buildModuleInstallation?(module: Module): Promise<UserOpBuilder>
}

export interface ValidationAPI {
	getDummySignature(): Promise<string>
	formatSignature(sig: string): Promise<string>
}
