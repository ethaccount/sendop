// https://eips.ethereum.org/EIPS/eip-7677

import type { UserOperationHex } from './core'

// [userOp, entryPoint, chainId, context]
export type GetPaymasterStubDataParams = [
	UserOperationHex, // userOp
	string, // EntryPoint
	string, // Chain ID
	Record<string, any>, // Context
]

export type GetPaymasterStubDataResult = {
	sponsor?: { name: string; icon?: string } // Sponsor info
	paymaster: string // Paymaster address
	paymasterData: string // Paymaster data
	paymasterVerificationGasLimit: string // Paymaster validation gas
	paymasterPostOpGasLimit: string // Paymaster post-op gas
	isFinal?: boolean // Indicates that the caller does not need to call pm_getPaymasterData
}

// [userOp, entryPoint, chainId, context]
export type GetPaymasterDataParams = [
	UserOperationHex, // userOp
	string, // Entrypoint
	string, // Chain ID
	Record<string, any>, // Context
]

export type GetPaymasterDataResult = {
	paymaster: string // Paymaster address
	paymasterData: string // Paymaster data
}
