import type { Bundler, OperationGetter, PaymasterGetter } from './interface'
import type { UserOperationReceipt } from 'ethers-erc4337'

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
	wait(): Promise<UserOperationReceipt>
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
