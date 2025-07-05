import { Interface, JsonRpcProvider, MaxUint256 } from 'ethers'
import { Contract } from 'ethers'
import type { TypedDataDomain } from 'ethers'
import type { TypedData } from 'ethers-erc4337'

export async function getPermitTypedData({
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
