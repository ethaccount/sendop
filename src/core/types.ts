import type { EntryPointVersion } from '@/utils'
import type { TransactionReceipt } from 'ethers'
import type { Bundler, OperationGetter, PaymasterGetter } from './interface'

export type UserOp = {
	sender: string
	nonce: string
	factory: string | null
	factoryData: string | '0x'
	callData: string
	callGasLimit: string | '0x0'
	verificationGasLimit: string | '0x0'
	preVerificationGas: string | '0x0'
	maxFeePerGas: string | '0x0'
	maxPriorityFeePerGas: string | '0x0'
	paymaster: string | null
	paymasterVerificationGasLimit: string | '0x0'
	paymasterPostOpGasLimit: string | '0x0'
	paymasterData: string | '0x'
	signature: string | '0x'
}

export type PackedUserOp = {
	sender: string
	nonce: string
	initCode: string
	callData: string
	accountGasLimits: string
	preVerificationGas: string
	gasFees: string
	paymasterAndData: string
	signature: string
}

export type UserOpLog = {
	logIndex: string
	transactionIndex: string
	transactionHash: string
	blockHash: string
	blockNumber: string
	address: string
	data: string
	topics: string[]
}

export type UserOpReceipt = {
	userOpHash: string
	entryPoint: string
	sender: string
	nonce: string
	paymaster: string
	actualGasUsed: string
	actualGasCost: string
	success: boolean
	logs: UserOpLog[]
	receipt: TransactionReceipt
}

export type SendopOptions = {
	bundler: Bundler
	executions: Execution[]
	opGetter: OperationGetter
	pmGetter?: PaymasterGetter
	initCode?: string // userOp.factory ++ userOp.factoryData
	nonce?: bigint
	entryPointVersion?: EntryPointVersion // defaults to v0.7
}

export type SendOpResult = {
	hash: string
	wait(): Promise<UserOpReceipt>
}

export type BuildopResult = {
	userOp: UserOp
	userOpHash: string
}

export type Execution = {
	to: string
	data: string
	value: bigint
}

export type GetPaymasterStubDataResult = {
	sponsor?: { name: string; icon?: string } // Sponsor info
	paymaster?: string // Paymaster address (entrypoint v0.7)
	paymasterData?: string // Paymaster data (entrypoint v0.7)
	paymasterVerificationGasLimit?: string // Paymaster validation gas (entrypoint v0.7)
	paymasterPostOpGasLimit?: string // Paymaster post-op gas (entrypoint v0.7)
	isFinal?: boolean // Indicates that the caller does not need to call pm_getPaymasterData
}

export type GetPaymasterDataResult = {
	paymaster?: string // Paymaster address (entrypoint v0.7)
	paymasterData?: string // Paymaster data (entrypoint v0.7)
}
