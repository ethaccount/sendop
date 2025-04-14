import { createConsola } from 'consola'
import { Wallet } from 'ethers'

import 'dotenv/config'

export const logger = createConsola({
	level: 4,
})

// 0: Fatal and Error
// 1: Warnings
// 2: Normal logs
// 3: Informational logs, success, fail, ready, start, ...
// 4: Debug logs
// 5: Trace logs
// -999: Silent
// +999: Verbose logs

// consola.info("Using consola 3.0.0");
// consola.start("Building project...");
// consola.warn("A new version of consola is available: 3.0.1");
// consola.success("Project built!");
// consola.error(new Error("This is an example error. Everything is fine!"));
// consola.box("I am a simple box");
// await consola.prompt("Deploy to the production?", {
//   type

export function getEnv() {
	if (!process.env.ALCHEMY_API_KEY) {
		throw new Error('Missing ALCHEMY_API_KEY')
	}

	const PRIVATE_KEY = process.env.PRIVATE_KEY
	const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY
	const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY
	const SALT = process.env.SALT || '0x0000000000000000000000000000000000000000000000000000000000000001'
	const CHAIN_ID = process.env.CHAIN_ID ? BigInt(process.env.CHAIN_ID) : 1337n
	const PIMLICO_SPONSORSHIP_POLICY_ID = process.env.PIMLICO_SPONSORSHIP_POLICY_ID

	return {
		PRIVATE_KEY,
		ALCHEMY_API_KEY,
		PIMLICO_API_KEY,
		SALT,
		CHAIN_ID,
		PIMLICO_SPONSORSHIP_POLICY_ID,
	}
}

export function getBundlerUrl(chainId: bigint, source: 'pimlico' | 'alchemy' = 'pimlico') {
	const { PIMLICO_API_KEY, ALCHEMY_API_KEY } = getEnv()
	switch (chainId) {
		case 1337n:
			return 'http://localhost:4337'
		case 11155111n:
			switch (source) {
				case 'pimlico':
					return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`
				case 'alchemy':
					return `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
			}
		default:
			throw new Error('getBundlerUrl: Invalid chainId')
	}
}

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
		} else if (chainId === 7078815900n) {
			return 'https://rpc.mekong.ethpandaops.io'
		}
		throw new Error('Invalid chainId')
	}

	// Priority: setup({chainId}) > .env CHAIN_ID > 1337n
	const chainId = options?.chainId || CHAIN_ID || 1337n

	const CLIENT_URL = getClientUrl(chainId)

	// TODO: Distinguish between Pimlico and Alchemy
	const BUNDLER_URL = getBundlerUrl(chainId)
	const PIMLICO_BUNDLER_URL = getBundlerUrl(chainId, 'pimlico')
	const ALCHEMY_BUNDLER_URL = getBundlerUrl(chainId, 'alchemy')

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

export function askForChainId() {
	const defaultChainId = 11155111n
	const chainIdInput = prompt('Enter chainId (defaults to 11155111):')
	const chainId =
		chainIdInput === 's' ? defaultChainId : chainIdInput === 'm' ? 7078815900n : chainIdInput || defaultChainId

	logger.info(`ChainId: ${chainId}`)
	return BigInt(chainId)
}
