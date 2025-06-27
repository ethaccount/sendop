import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { type GetPaymasterDataResult, type GetPaymasterStubDataResult, type PaymasterGetter } from '@/core'
import type { UserOperation } from '@/ethers-erc4337'
import type { TypedData } from '@/utils'
import { zeroPadLeft } from '@/utils'
import type { JsonRpcProvider, TypedDataDomain } from 'ethers'
import { concat, Contract, Interface, MaxUint256, toBeHex, TypedDataEncoder } from 'ethers'

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
		const permitData = await getPermitData({
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

async function getPermitData({
	client,
	tokenAddress,
	chainId,
	ownerAddress,
	spenderAddress,
	amount,
}: {
	client: JsonRpcProvider
	tokenAddress: string
	chainId: bigint
	ownerAddress: string
	spenderAddress: string
	amount: bigint
}): Promise<TypedData> {
	const token = new Contract(
		tokenAddress,
		new Interface([
			'function name() view returns (string)',
			'function version() view returns (string)',
			'function nonces(address owner) view returns (uint256)',
		]),
		client,
	)

	const domain: TypedDataDomain = {
		name: await token.getFunction('name')(),
		version: await token.getFunction('version')(),
		chainId: chainId,
		verifyingContract: tokenAddress,
	}

	const types = {
		Permit: [
			{ name: 'owner', type: 'address' },
			{ name: 'spender', type: 'address' },
			{ name: 'value', type: 'uint256' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' },
		],
	}

	const value = {
		owner: ownerAddress,
		spender: spenderAddress,
		value: amount,
		nonce: await token.getFunction('nonces')(ownerAddress),
		deadline: MaxUint256,
	}

	return [domain, types, value]
}
