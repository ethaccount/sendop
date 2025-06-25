import { getBigInt, toBeHex } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import { beforeAll, describe, expect, it } from 'vitest'
import { ERC4337Bundler } from './ERC4337Bundler'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '' } = process.env
const CHAIN_ID = 11155111

describe('ERC4337Bundler', () => {
	beforeAll(async () => {
		if (!ALCHEMY_API_KEY) {
			throw new Error('ALCHEMY_API_KEY is not set')
		}
	})

	it('should return the chain id', async () => {
		const alchemyBundler = new ERC4337Bundler(alchemy(CHAIN_ID, ALCHEMY_API_KEY))
		const chainId = await alchemyBundler.chainId()
		expect(chainId).toBe(getBigInt(CHAIN_ID))

		const pimlicoBundler = new ERC4337Bundler(pimlico(CHAIN_ID, PIMLICO_API_KEY))
		const pimlicoChainId = await pimlicoBundler.chainId()
		expect(pimlicoChainId).toBe(getBigInt(CHAIN_ID))
	})

	it('cannot send eth methods', async () => {
		const pimlicoBundler = new ERC4337Bundler(pimlico(CHAIN_ID, PIMLICO_API_KEY))
		await expect(pimlicoBundler.send('eth_getBlockByNumber', [])).rejects.toThrow(
			"Method 'eth_getBlockByNumber' not supported.",
		)

		const alchemyBundler = new ERC4337Bundler(alchemy(CHAIN_ID, ALCHEMY_API_KEY), undefined, {
			supportsEthMethods: true,
		})

		const block = await alchemyBundler.getBlockNumber()
		expect(block).toBeGreaterThan(0)
	})
})
