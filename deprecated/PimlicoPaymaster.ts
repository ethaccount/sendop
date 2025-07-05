import { ADDRESS } from '@/addresses'
import { type GetPaymasterDataResult, type GetPaymasterStubDataResult, type PaymasterGetter } from '@/sendop'
import { toUserOpHex, type UserOperation } from 'ethers-erc4337'
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

	async getPaymasterStubData(userOp: UserOperation): Promise<GetPaymasterStubDataResult> {
		return this.rpcProvider.send({
			method: 'pm_getPaymasterStubData',
			params: [
				toUserOpHex(userOp),
				ADDRESS.EntryPointV07,
				toBeHex(this.chainId),
				{
					sponsorshipPolicyId: this.sponsorshipPolicyId,
				},
			],
		})
	}

	async getPaymasterData(userOp: UserOperation): Promise<GetPaymasterDataResult> {
		return this.rpcProvider.send({
			method: 'pm_getPaymasterData',
			params: [
				toUserOpHex(userOp),
				ADDRESS.EntryPointV07,
				toBeHex(this.chainId),
				{
					sponsorshipPolicyId: this.sponsorshipPolicyId,
				},
			],
		})
	}
}
