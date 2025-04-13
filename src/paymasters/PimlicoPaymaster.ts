import type { GetPaymasterDataResult, GetPaymasterStubDataResult, PaymasterGetter, UserOp } from '@/core'
import { ADDRESS } from '@/addresses'
import { RpcProvider } from '@/RpcProvider'
import { toBeHex } from 'ethers'

export class PimlicoPaymaster implements PaymasterGetter {
	chainId: bigint
	paymaster: RpcProvider
	sponsorshipPolicyId: string

	constructor(options: { chainId: bigint; url: string; sponsorshipPolicyId: string }) {
		this.chainId = options.chainId
		this.paymaster = new RpcProvider(options.url)
		this.sponsorshipPolicyId = options.sponsorshipPolicyId
	}

	async getPaymasterStubData(userOp: UserOp): Promise<GetPaymasterStubDataResult> {
		return this.paymaster.send({
			method: 'pm_getPaymasterStubData',
			params: [
				userOp,
				ADDRESS.EntryPointV07,
				toBeHex(this.chainId),
				{
					sponsorshipPolicyId: this.sponsorshipPolicyId,
				},
			],
		})
	}

	async getPaymasterData(userOp: UserOp): Promise<GetPaymasterDataResult> {
		return this.paymaster.send({
			method: 'pm_getPaymasterData',
			params: [
				userOp,
				ADDRESS.EntryPointV07,
				toBeHex(this.chainId),
				{
					sponsorshipPolicyId: this.sponsorshipPolicyId,
				},
			],
		})
	}
}
