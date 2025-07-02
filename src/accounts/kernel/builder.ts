import type { ValidatorModule } from '@/modules/types'
import type { Execution } from '@/types'
import type { BigNumberish } from 'ethers'
import { getBytes, JsonRpcProvider } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, ERC4337Bundler, UserOpBuilder, type TypedData } from 'ethers-erc4337'
import { EntryPointV07__factory } from 'ethers-erc4337/dist'
import { encode7579Executions } from '../../erc7579/encode7579Executions'
import type { AccountBuilder } from '../types'
import { getNonceKey } from './api/getNonceKey'

export class KernelUserOpBuilder extends UserOpBuilder implements AccountBuilder {
	private validator: ValidatorModule
	private accountAddress: string
	private client: JsonRpcProvider

	constructor({
		chainId,
		bundler,
		client,
		accountAddress,
		validator,
	}: {
		chainId: BigNumberish
		bundler: ERC4337Bundler
		client: JsonRpcProvider // only for getting nonce
		accountAddress: string
		validator: ValidatorModule
	}) {
		super(bundler, ENTRY_POINT_V07_ADDRESS, chainId)
		this.client = client
		this.validator = validator
		this.accountAddress = accountAddress
	}

	getSender(): string {
		return this.accountAddress
	}

	async getNonce(): Promise<BigNumberish> {
		const entrypoint = EntryPointV07__factory.connect(ENTRY_POINT_V07_ADDRESS, this.client)
		const nonceKey = getNonceKey(this.validator.address)
		return await entrypoint.getNonce(this.accountAddress, nonceKey)
	}

	async getDummySignature() {
		return this.validator.getDummySignature()
	}

	async formatSignature(sig: string) {
		return this.validator.formatSignature(sig)
	}

	async getCallData(executions: Execution[]): Promise<string> {
		return await encode7579Executions(executions)
	}

	async buildExecutions(executions: Execution[]): Promise<UserOpBuilder> {
		return this.setSender(this.getSender())
			.setNonce(await this.getNonce())
			.setCallData(await this.getCallData(executions))
			.setSignature(await this.getDummySignature())
	}

	override async signUserOpHash(fn: (userOpHash: Uint8Array) => Promise<string>): Promise<void> {
		const signature = await fn(getBytes(this.hash()))
		this.setSignature(await this.formatSignature(signature))
	}

	override async signUserOpTypedData(fn: (typedData: TypedData) => Promise<string>): Promise<void> {
		// Kernel doesn't support entrypoint v0.8
		throw new Error('signUserOpTypedData is not supported')
	}
}
