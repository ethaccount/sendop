import { JsonRpcProvider } from 'ethers'

export async function fetchGasPriceAlchemy(alchemyUrl: string): Promise<{
	maxFeePerGas: bigint
	maxPriorityFeePerGas: bigint
}> {
	const provider = new JsonRpcProvider(alchemyUrl)

	const [block, maxPriorityFeePerGas] = await Promise.all([
		provider.send('eth_getBlockByNumber', ['latest', true]), // https://docs.alchemy.com/reference/eth-getblockbynumber
		provider.send('rundler_maxPriorityFeePerGas', []), // https://docs.alchemy.com/reference/rundler-maxpriorityfeepergas
	])

	const maxFeePerGas = (BigInt(block.baseFeePerGas) * 150n) / 100n + BigInt(maxPriorityFeePerGas)

	return {
		maxFeePerGas,
		maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
	}
}

export async function fetchGasPricePimlico(
	pimlicoUrl: string,
	gasPriceType: 'slow' | 'standard' | 'fast' = 'standard',
): Promise<{
	maxFeePerGas: bigint
	maxPriorityFeePerGas: bigint
}> {
	const provider = new JsonRpcProvider(pimlicoUrl)
	const result = await provider.send('pimlico_getUserOperationGasPrice', [])

	if (!result) {
		throw new Error(`[fetchGasPricePimlico] Failed to fetch gas price from Pimlico`)
	}

	const gasData = result[gasPriceType]
	if (!gasData) {
		throw new Error(`[fetchGasPricePimlico] Invalid gas price type: ${gasPriceType}`)
	}

	return {
		maxFeePerGas: BigInt(gasData.maxFeePerGas),
		maxPriorityFeePerGas: BigInt(gasData.maxPriorityFeePerGas),
	}
}
