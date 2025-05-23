import type { Bundler, OperationGetter, PaymasterGetter } from './interface'

export type UserOp = {
	sender: string
	nonce: bigint
	factory: string | null
	factoryData: string | '0x'
	callData: string
	callGasLimit: bigint
	verificationGasLimit: bigint
	preVerificationGas: bigint
	maxFeePerGas: bigint
	maxPriorityFeePerGas: bigint
	paymaster: string | null
	paymasterVerificationGasLimit: bigint
	paymasterPostOpGasLimit: bigint
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
	receipt: {
		transactionHash: string
		transactionIndex: string
		from: string
		to: string
		status: string
		logsBloom: string
		blockHash: string
		blockNumber: string
		contractAddress: null | string
		gasUsed: string
		cumulativeGasUsed: string
		effectiveGasPrice: string
		logs: UserOpLog[]
	}
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

export type Execution = {
	to: string
	data: string
	value: bigint
}

/**
 * @dev https://eips.ethereum.org/EIPS/eip-7677
 */
export type GetPaymasterStubDataResult = {
	sponsor?: { name: string; icon?: string } // Sponsor info
	paymaster?: string
	paymasterData?: string | '0x'
	paymasterVerificationGasLimit?: bigint
	paymasterPostOpGasLimit?: bigint
	isFinal?: boolean // Indicates whether the caller needs to call pm_getPaymasterData
}

/**
 * @dev https://eips.ethereum.org/EIPS/eip-7677
 */
export type GetPaymasterDataResult = {
	paymaster?: string
	paymasterData?: string | '0x'
}
