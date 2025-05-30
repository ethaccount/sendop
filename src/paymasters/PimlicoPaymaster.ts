import {
	formatUserOpToHex,
	type GetPaymasterDataResult,
	type GetPaymasterStubDataResult,
	type PaymasterGetter,
	type UserOp,
} from '@/core'
import { ADDRESS } from '@/addresses'
import { RpcProvider } from '@/RpcProvider'
import { toBeHex } from 'ethers'

export class PimlicoPaymaster implements PaymasterGetter {
	chainId: bigint
	rpcProvider: RpcProvider
	sponsorshipPolicyId: string

	constructor(options: { chainId: bigint; url: string; sponsorshipPolicyId: string }) {
		this.chainId = options.chainId
		this.rpcProvider = new RpcProvider(options.url)
		this.sponsorshipPolicyId = options.sponsorshipPolicyId
	}

	async getPaymasterStubData(userOp: UserOp): Promise<GetPaymasterStubDataResult> {
		return this.rpcProvider.send({
			method: 'pm_getPaymasterStubData',
			params: [
				formatUserOpToHex(userOp),
				ADDRESS.EntryPointV07,
				toBeHex(this.chainId),
				{
					sponsorshipPolicyId: this.sponsorshipPolicyId,
				},
			],
		})
	}

	async getPaymasterData(userOp: UserOp): Promise<GetPaymasterDataResult> {
		return this.rpcProvider.send({
			method: 'pm_getPaymasterData',
			params: [
				formatUserOpToHex(userOp),
				ADDRESS.EntryPointV07,
				toBeHex(this.chainId),
				{
					sponsorshipPolicyId: this.sponsorshipPolicyId,
				},
			],
		})
	}
}
