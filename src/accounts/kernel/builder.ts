import { type Execution } from '@/core'
import type { Validator } from '@/modules/types'
import type { BigNumberish } from 'ethers'
import { getBytes, JsonRpcProvider } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, ERC4337Bundler, UserOpBuilder, type TypedData } from 'ethers-erc4337'
import { EntryPointV07__factory } from 'ethers-erc4337/dist'
import { encodeERC7579Execution } from '../encodeERC7579Execution'
import { Kernel } from './api'
import { getNonceKey } from './api/getNonceKey'
import type { AccountAPI } from '../types'

export class KernelUserOpBuilder extends UserOpBuilder implements AccountAPI {
	private validator: Validator
	private accountAddress: string
	private client: JsonRpcProvider

	static computeAddress = Kernel.computeAddress
	static getNonceKey = Kernel.getNonceKey
	static signERC1271 = Kernel.signERC1271

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
		validator: Validator
	}) {
		super(bundler, ENTRY_POINT_V07_ADDRESS, chainId)
		this.client = client
		this.validator = validator
		this.accountAddress = accountAddress
	}

	async getDummySignature() {
		return this.validator.getDummySignature()
	}

	async formatSignature(sig: string) {
		return this.validator.formatSignature(sig)
	}

	getSender(): string {
		return this.accountAddress
	}

	async getNonce(): Promise<BigNumberish> {
		const entrypoint = EntryPointV07__factory.connect(ENTRY_POINT_V07_ADDRESS, this.client)
		const nonceKey = getNonceKey(this.validator.address)
		return await entrypoint.getNonce(this.accountAddress, nonceKey)
	}

	async getCallData(executions: Execution[]): Promise<string> {
		return await encodeERC7579Execution(executions)
	}

	async buildExecution(executions: Execution[]): Promise<UserOpBuilder> {
		return this.setSender(this.getSender())
			.setNonce(await this.getNonce())
			.setCallData(await this.getCallData(executions))
			.setSignature(await this.getDummySignature())
	}

	override async signUserOpHash(fn: (userOpHash: Uint8Array) => Promise<string>): Promise<void> {
		const signature = await fn(getBytes(this.hash()))
		this.setSignature(await this.formatSignature(signature))
	}

	// Kernel doesn't support entrypoint v0.8 yet
	override async signUserOpTypedData(fn: (typedData: TypedData) => Promise<string>): Promise<void> {
		throw new Error('signUserOpTypedData is not supported')
	}
}
