import { AlchemyBundler, EtherspotBundler, PimlicoBundler } from '@/bundlers'
import type { BundlerOptions } from '@/bundlers/BaseBundler'
import type { Bundler } from '@/core'
import { createConsola } from 'consola'
import { JsonRpcProvider, Wallet } from 'ethers'
import { alchemy } from 'node_modules/evm-providers/dist/providers'
import type { Chain } from 'node_modules/evm-providers/dist/providers/alchemy'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const logger = createConsola({
	level: 4, // Debug logs
})

interface YargsOptions {
	'rpc-url': string
	'private-key': string
	bundler: 'pimlico' | 'alchemy' | 'etherspot'
	address: string
	entryPoint: '07' | '08'
}

interface SetupResult {
	argv: YargsOptions
	client: JsonRpcProvider
	chainId: bigint
	signer: Wallet
	bundler: Bundler
}

type OptionAlias = 'r' | 'p' | 'b' | 'a' | 'e'

/**
 * Sets up yargs with dynamic options and returns web3 objects
 * @param options Array of option aliases to include ['r' for rpc-url, 'p' for private-key, 'b' for bundler]
 * @returns {Promise<SetupResult>} Object containing argv, client, chainId, and signer
 */
export async function setupCLI(
	optionAliases: OptionAlias[] = [],
	options?: {
		bundlerOptions?: BundlerOptions
	},
): Promise<SetupResult> {
	let yargsInstance = yargs(hideBin(process.argv))

	// Map of aliases to their full option configurations
	const optionConfigs = {
		r: {
			option: 'rpc-url',
			type: 'string',
			description: 'RPC URL',
			demandOption: true,
			default: 'http://localhost:8545',
		},
		p: {
			option: 'private-key',
			type: 'string',
			description: 'Private key',
			demandOption: true,
			default: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
		},
		b: {
			option: 'bundler',
			type: 'string',
			description: 'Bundler',
			choices: ['pimlico', 'alchemy', 'etherspot'] as const,
			demandOption: false,
			default: 'pimlico',
		},
		a: {
			option: 'address',
			type: 'string',
			description: 'Address',
			demandOption: false,
		},
		e: {
			option: 'entryPoint',
			type: 'string',
			description: 'EntryPoint version',
			choices: ['07', '08'] as const,
			demandOption: false,
			default: '07',
		},
	} as const

	// Add requested options
	for (const alias of optionAliases) {
		const config = optionConfigs[alias]
		if (config) {
			yargsInstance = yargsInstance.option(config.option, {
				alias,
				...config,
			})
		}
	}

	// Force type assertion since we know the structure matches YargsOptions
	const argv = (await yargsInstance.help().argv) as unknown as YargsOptions

	const client = new JsonRpcProvider(argv['rpc-url'])
	const chainId = await client.getNetwork().then(network => network.chainId)
	const signer = new Wallet(argv['private-key'], client)

	logger.info(`chainId: ${chainId}`)
	logger.info(`signer: ${signer.address}`)

	let bundler: Bundler

	let bundlerUrl: string
	switch (argv.bundler) {
		case 'pimlico':
			bundlerUrl = getBundlerUrl(chainId, { type: 'pimlico' })
			bundler = new PimlicoBundler(chainId, bundlerUrl, options?.bundlerOptions)
			break
		case 'alchemy':
			bundlerUrl = getBundlerUrl(chainId, { type: 'alchemy' })
			bundler = new AlchemyBundler(chainId, bundlerUrl, options?.bundlerOptions)
			break
		case 'etherspot':
			switch (argv.entryPoint) {
				case '07':
					bundlerUrl = getBundlerUrl(chainId, { type: 'etherspot', version: 'v2' })
					bundler = new EtherspotBundler(chainId, bundlerUrl, options?.bundlerOptions)
					break
				case '08':
					bundlerUrl = getBundlerUrl(chainId, { type: 'etherspot', version: 'v3' })
					bundler = new EtherspotBundler(chainId, bundlerUrl, options?.bundlerOptions)
					break
			}
			break
		default:
			bundlerUrl = getBundlerUrl(chainId, { type: 'pimlico' })
			bundler = new PimlicoBundler(chainId, bundlerUrl, options?.bundlerOptions)
			break
	}

	if (optionAliases.includes('b')) {
		logger.info(`bundler: ${argv.bundler}, url: ${bundlerUrl}`)
	}

	return {
		argv,
		client,
		chainId,
		signer,
		bundler,
	}
}

type BundlerSource = { type: 'pimlico' } | { type: 'alchemy' } | { type: 'etherspot'; version: 'v2' | 'v3' }

export function getBundlerUrl(chainId: bigint, source: BundlerSource = { type: 'pimlico' }) {
	const { PIMLICO_API_KEY, ALCHEMY_API_KEY, ETHERSPOT_API_KEY } = getEnv()
	switch (chainId) {
		case 1337n:
			return 'http://localhost:4337'
		case 11155111n:
			if (source.type === 'alchemy') {
				return `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
			}
	}

	switch (source.type) {
		case 'pimlico':
			return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`
		case 'alchemy':
			return alchemy(Number(chainId) as unknown as Chain, ALCHEMY_API_KEY)
		case 'etherspot':
			return `https://rpc.etherspot.io/${source.version}/${chainId}/?api-key=${ETHERSPOT_API_KEY}`
	}
}

export function getEnv() {
	if (!process.env.ALCHEMY_API_KEY) {
		throw new Error('Missing ALCHEMY_API_KEY')
	}

	const PRIVATE_KEY = process.env.PRIVATE_KEY
	const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY
	const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY
	const ETHERSPOT_API_KEY = process.env.ETHERSPOT_API_KEY
	const SALT = process.env.SALT || '0x0000000000000000000000000000000000000000000000000000000000000001'
	const CHAIN_ID = process.env.CHAIN_ID ? BigInt(process.env.CHAIN_ID) : 1337n
	const PIMLICO_SPONSORSHIP_POLICY_ID = process.env.PIMLICO_SPONSORSHIP_POLICY_ID

	return {
		PRIVATE_KEY,
		ALCHEMY_API_KEY,
		PIMLICO_API_KEY,
		ETHERSPOT_API_KEY,
		SALT,
		CHAIN_ID,
		PIMLICO_SPONSORSHIP_POLICY_ID,
	}
}
