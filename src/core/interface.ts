import { SendopError } from '@/error'
import type { TypedDataDomain, TypedDataField } from 'ethers'
import type {
	Execution,
	GetPaymasterDataResult,
	GetPaymasterStubDataResult,
	PackedUserOp,
	UserOp,
	UserOpReceipt,
} from './types'

export interface Bundler {
	chainId: string
	entryPointAddress: string
	getGasValues(userOp: UserOp): Promise<{
		maxFeePerGas: bigint
		maxPriorityFeePerGas: bigint
		preVerificationGas: bigint
		verificationGasLimit: bigint
		callGasLimit: bigint
	}>
	sendUserOperation(userOp: UserOp): Promise<string>
	getUserOperationReceipt(hash: string): Promise<UserOpReceipt>
}

export interface OperationGetter extends AccountGetter, SignatureGetter {}

export interface AccountGetter {
	getSender(): Promise<string> | string
	getNonce(): Promise<bigint> | bigint
	getCallData(executions: Execution[]): Promise<string> | string
}

export interface SignatureGetter {
	getDummySignature(userOp: UserOp): Promise<string> | string
	getSignature(signatureData: SignatureData): Promise<string> | string
}

export type SignatureData = SignatureDataV07 | SignatureDataV08

export interface SignatureDataV07 {
	entryPointVersion: 'v0.7'
	hash: Uint8Array
	userOp: UserOp
}

export interface SignatureDataV08 {
	entryPointVersion: 'v0.8'
	hash: Uint8Array
	userOp: UserOp
	domain: TypedDataDomain
	types: Record<string, Array<TypedDataField>>
	values: PackedUserOp
}

export abstract class ERC7579Validator implements SignatureGetter {
	abstract address(): string
	abstract getDummySignature(userOp: UserOp): Promise<string> | string
	abstract getSignature(signatureData: SignatureData): Promise<string> | string

	static getInitData(args: any): string {
		throw new ERC7579ValidatorError('Not implemented')
	}

	static getDeInitData(args: any): string {
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
