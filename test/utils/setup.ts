import { Wallet } from 'ethers'

import 'dotenv/config'
import { getBundlerUrl, getEnv, logger } from './cli'

// this should be deprecated

export async function setup(options?: { chainId?: bigint }) {
	const { PRIVATE_KEY, ALCHEMY_API_KEY, PIMLICO_API_KEY, SALT, CHAIN_ID, PIMLICO_SPONSORSHIP_POLICY_ID } = getEnv()

	const getClientUrl = (chainId: bigint) => {
		// Default to localhost
		if (chainId === 1337n) {
			return 'http://localhost:8545'
		}
		// Existing network configs
		if (chainId === 11155111n) {
			return `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
		}
		throw new Error('Invalid chainId')
	}

	// Priority: setup({chainId}) > .env CHAIN_ID > 1337n
	const chainId = options?.chainId || CHAIN_ID || 1337n

	const CLIENT_URL = getClientUrl(chainId)

	const BUNDLER_URL = getBundlerUrl(chainId)
	const PIMLICO_BUNDLER_URL = getBundlerUrl(chainId, { type: 'pimlico' })
	const ALCHEMY_BUNDLER_URL = getBundlerUrl(chainId, { type: 'alchemy' })

	// If using local network, fetch actual chainId from the network
	let actualChainId = chainId
	let isLocal = false

	const DEFAULT_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
	const privateKey = chainId === 1337n || !PRIVATE_KEY ? DEFAULT_PRIVATE_KEY : PRIVATE_KEY

	if (chainId === 1337n) {
		isLocal = true

		try {
			const response = await fetch(CLIENT_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_chainId',
					params: [],
					id: 1,
				}),
			})
			const data = await response.json()
			actualChainId = BigInt(parseInt(data.result, 16))
		} catch (error) {
			logger.warn('Failed to fetch chainId from local network, using default')
		}
	}

	const account0 = new Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
	const account1 = new Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d')

	return {
		isLocal,
		logger,
		chainId: actualChainId,
		CLIENT_URL,
		BUNDLER_URL,
		ALCHEMY_BUNDLER_URL,
		PIMLICO_BUNDLER_URL,
		privateKey,
		SALT,
		ALCHEMY_API_KEY,
		PIMLICO_API_KEY,
		PIMLICO_SPONSORSHIP_POLICY_ID,
		account0,
		account1,
	}
}
