import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { type GetPaymasterDataResult, type GetPaymasterStubDataResult, type PaymasterGetter } from '@/core'
import type { UserOperation } from 'ethers-erc4337'
import { getPermitTypedData, zeroPadLeft } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { concat, Contract, Interface, toBeHex, TypedDataEncoder } from 'ethers'

export type CircleUSDCPaymasterOptions = {
	client: JsonRpcProvider
	chainId: bigint
	paymasterAddress: string
	tokenAddress: string
	permitAmount: bigint
	getSignature: (permitHash: string) => Promise<string>
}

export class CircleUSDCPaymaster implements PaymasterGetter {
	public readonly options: CircleUSDCPaymasterOptions
	public paymaster: Contract

	constructor(options: CircleUSDCPaymasterOptions) {
		this.options = options
		this.paymaster = new Contract(
			options.paymasterAddress,
			new Interface(['function additionalGasCharge() view returns (uint256)']),
			options.client,
		)
	}

	async getPaymasterStubData(_userOp: UserOperation): Promise<GetPaymasterStubDataResult> {
		const additionalGasCharge = await this.paymaster.getFunction('additionalGasCharge')()

		// paymasterData = 0x00 || usdc address || Max spendable gas in USDC || EIP-2612 permit signature
		const stubData = concat([
			'0x00',
			this.options.tokenAddress,
			zeroPadLeft(toBeHex(this.options.permitAmount)),
			DUMMY_ECDSA_SIGNATURE,
		])

		return {
			paymaster: this.options.paymasterAddress,
			paymasterData: stubData,
			paymasterPostOpGasLimit: additionalGasCharge,
			isFinal: false,
		}
	}

	async getPaymasterData(userOp: UserOperation): Promise<GetPaymasterDataResult> {
		const permitData = await getPermitTypedData({
			client: this.options.client,
			tokenAddress: this.options.tokenAddress,
			chainId: this.options.chainId,
			ownerAddress: userOp.sender,
			spenderAddress: this.options.paymasterAddress,
			amount: this.options.permitAmount,
		})

		const permitHash = TypedDataEncoder.hash(...permitData)

		const paymasterData = concat([
			'0x00',
			this.options.tokenAddress,
			zeroPadLeft(toBeHex(this.options.permitAmount)),
			await this.options.getSignature(permitHash),
		])

		return {
			paymaster: this.options.paymasterAddress,
			paymasterData,
		}
	}
}
