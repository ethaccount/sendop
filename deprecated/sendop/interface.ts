import { SendopError } from '@/error'
import type { TypedDataDomain, TypedDataField } from 'ethers'
import type { Execution } from '@/types'
import type { PackedUserOperation, UserOperation, UserOperationReceipt } from 'ethers-erc4337'
import type { GetPaymasterDataResult, GetPaymasterStubDataResult } from './types'

export type GasValues = {
	maxFeePerGas: bigint
	maxPriorityFeePerGas: bigint
	preVerificationGas: bigint
	verificationGasLimit: bigint
	callGasLimit: bigint
	paymasterVerificationGasLimit: bigint
}

export interface Bundler {
	url: string
	chainId: bigint
	entryPointAddress: string
	getGasValues(userOp: UserOperation): Promise<GasValues>
	sendUserOperation(userOp: UserOperation): Promise<string>
	getUserOperationReceipt(hash: string): Promise<UserOperationReceipt>
}

export interface OperationGetter extends AccountGetter, SignatureGetter {}

export interface AccountGetter {
	getSender(): Promise<string> | string
	getNonce(): Promise<bigint> | bigint
	getCallData(executions: Execution[]): Promise<string> | string
}

export interface SignatureGetter {
	getDummySignature(userOp: UserOperation): Promise<string> | string
	getSignature(signatureData: SignatureData): Promise<string> | string
}

export type SignatureData = SignatureDataV07 | SignatureDataV08

export interface SignatureDataV07 {
	entryPointVersion: 'v0.7'
	hash: Uint8Array
	userOp: UserOperation
}

export interface SignatureDataV08 {
	entryPointVersion: 'v0.8'
	hash: Uint8Array
	userOp: UserOperation
	domain: TypedDataDomain
	types: Record<string, Array<TypedDataField>>
	values: PackedUserOperation
}

export abstract class ERC7579Validator implements SignatureGetter {
	abstract address(): string
	abstract getDummySignature(userOp: UserOperation): Promise<string> | string
	abstract getSignature(signatureData: SignatureData): Promise<string> | string

	static getInitData(...args: any[]): string {
		throw new ERC7579ValidatorError('Not implemented')
	}

	static getDeInitData(...args: any[]): string {
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
 * @dev https://eips.ethereum.org/EIPS/eip-7677
 */
export interface PaymasterGetter {
	getPaymasterStubData(userOp: UserOperation): Promise<GetPaymasterStubDataResult> | GetPaymasterStubDataResult
	getPaymasterData?(userOp: UserOperation): Promise<GetPaymasterDataResult> | GetPaymasterDataResult
}
