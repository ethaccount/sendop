import { SendopError } from '@/error'
import type { BytesLike } from 'ethers'
import type { Execution, GetPaymasterDataResult, GetPaymasterStubDataResult, UserOp, UserOpReceipt } from './types'

export interface Bundler {
	chainId: string
	getGasValues(userOp: UserOp): Promise<{
		maxFeePerGas: string
		maxPriorityFeePerGas: string
		preVerificationGas: string
		verificationGasLimit: string
		callGasLimit: string
	}>
	sendUserOperation(userOp: UserOp): Promise<string>
	getUserOperationReceipt(hash: string): Promise<UserOpReceipt>
}

export interface OperationGetter extends AccountGetter, SignatureGetter {}

export interface AccountGetter {
	getSender(): Promise<string> | string
	getNonce(): Promise<string> | string
	getCallData(executions: Execution[]): Promise<string> | string
}

export interface SignatureGetter {
	getDummySignature(userOp: UserOp): Promise<string> | string
	getSignature(userOpHash: Uint8Array, userOp: UserOp): Promise<string> | string
}

export abstract class ERC7579Validator implements SignatureGetter {
	abstract address(): string
	abstract getDummySignature(userOp: UserOp): Promise<string> | string
	abstract getSignature(userOpHash: Uint8Array, userOp: UserOp): Promise<string> | string

	static getInitData(args: any): BytesLike {
		throw new ERC7579ValidatorError('Not implemented')
	}

	static getDeInitData(args: any): BytesLike {
		throw new ERC7579ValidatorError('Not implemented')
	}
}

export class ERC7579ValidatorError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, { cause })
		this.name = 'ERC7579ValidatorError'
	}
}

/**
 * refer to ERC-7677
 */
export interface PaymasterGetter {
	getPaymasterStubData(userOp: UserOp): Promise<GetPaymasterStubDataResult> | GetPaymasterStubDataResult
	getPaymasterData?(userOp: UserOp): Promise<GetPaymasterDataResult> | GetPaymasterDataResult
}
