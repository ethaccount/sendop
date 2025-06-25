import type { JsonRpcProvider } from 'ethers'

export async function fetchGasPriceAlchemy(alchemyProvider: JsonRpcProvider): Promise<{
	maxFeePerGas: bigint
	maxPriorityFeePerGas: bigint
}> {
	const [block, maxPriorityFeePerGas] = await Promise.all([
		alchemyProvider.send('eth_getBlockByNumber', ['latest', true]), // https://docs.alchemy.com/reference/eth-getblockbynumber
		alchemyProvider.send('rundler_maxPriorityFeePerGas', []), // https://docs.alchemy.com/reference/rundler-maxpriorityfeepergas
	])

	const maxFeePerGas = (BigInt(block.baseFeePerGas) * 150n) / 100n + BigInt(maxPriorityFeePerGas)

	return {
		maxFeePerGas,
		maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
	}
}
