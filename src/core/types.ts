import type { TransactionReceipt } from 'ethers'
import type { Bundler, OperationGetter, PaymasterGetter } from './interface'

export type UserOp = {
	sender: string
	nonce: string
	factory: string | null
	factoryData: string | '0x'
	callData: string
	callGasLimit: bigint | number
	verificationGasLimit: bigint | number
	preVerificationGas: bigint | number
	maxFeePerGas: bigint | number
	maxPriorityFeePerGas: bigint | number
	paymaster: string | null
	paymasterVerificationGasLimit: bigint | number
	paymasterPostOpGasLimit: bigint | number
	paymasterData: string | '0x'
	signature: string | '0x'
}

/**
 * @dev Only formatted in BaseBundler
 */
export type FormattedUserOp = {
	sender: string
	nonce: string
	factory: string | null
	factoryData: string | '0x'
	callData: string
	callGasLimit: string
	verificationGasLimit: string
	preVerificationGas: string
	maxFeePerGas: string
	maxPriorityFeePerGas: string
	paymaster: string | null
	paymasterVerificationGasLimit: string
	paymasterPostOpGasLimit: string
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
	paymasterVerificationGasLimit?: bigint // Paymaster validation gas (entrypoint v0.7)
	paymasterPostOpGasLimit?: bigint // Paymaster post-op gas (entrypoint v0.7)
	isFinal?: boolean // Indicates that the caller does not need to call pm_getPaymasterData
}

export type GetPaymasterDataResult = {
	paymaster?: string // Paymaster address (entrypoint v0.7)
	paymasterData?: string // Paymaster data (entrypoint v0.7)
}
