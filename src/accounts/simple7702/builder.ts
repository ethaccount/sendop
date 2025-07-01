import type { AccountAPI } from '@/accounts/types'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { type Execution } from '@/core'
import { INTERFACES } from '@/interfaces'
import type { BigNumberish } from 'ethers'
import { JsonRpcProvider } from 'ethers'
import { ENTRY_POINT_V08_ADDRESS, EntryPointV08__factory, ERC4337Bundler, UserOpBuilder } from 'ethers-erc4337'

const entryPointAddress = ENTRY_POINT_V08_ADDRESS

export class Simple7702UserOpBuilder extends UserOpBuilder implements AccountAPI {
	private accountAddress: string
	private client: JsonRpcProvider

	constructor({
		chainId,
		bundler,
		client,
		accountAddress,
	}: {
		chainId: BigNumberish
		bundler: ERC4337Bundler
		client: JsonRpcProvider // only for getting nonce
		accountAddress: string
	}) {
		super(bundler, entryPointAddress, chainId)
		this.client = client
		this.accountAddress = accountAddress
	}

	async getDummySignature() {
		return DUMMY_ECDSA_SIGNATURE
	}

	async formatSignature(sig: string) {
		return sig
	}

	getSender(): string {
		return this.accountAddress
	}

	async getNonce(): Promise<bigint> {
		const entrypoint = EntryPointV08__factory.connect(entryPointAddress, this.client)
		return await entrypoint.getNonce(this.accountAddress, 0)
	}

	async getCallData(executions: Execution[]): Promise<string> {
		return INTERFACES.Simple7702AccountV08.encodeFunctionData('execute', [
			executions[0].to,
			executions[0].value,
			executions[0].data,
		])
	}

	async buildExecution(executions: Execution[]): Promise<UserOpBuilder> {
		return this.setSender(this.getSender())
			.setNonce(await this.getNonce())
			.setCallData(await this.getCallData(executions))
			.setSignature(await this.getDummySignature())
	}
}
