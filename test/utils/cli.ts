import type { BundlerOptions } from '@/bundlers/BaseBundler'
import { JsonRpcProvider, Wallet } from 'ethers'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { AlchemyBundler, PimlicoBundler, EtherspotBundler, type Bundler } from '../../src'
import { getBundlerUrl, logger } from '../utils'

interface YargsOptions {
	'rpc-url': string
	'private-key': string
	bundler: 'pimlico' | 'alchemy' | 'etherspot'
	address: string
}

interface SetupResult {
	argv: YargsOptions
	client: JsonRpcProvider
	chainId: bigint
	signer: Wallet
	bundler: Bundler
}

type OptionAlias = 'r' | 'p' | 'b' | 'a'

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
			demandOption: true,
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

	switch (argv.bundler) {
		case 'pimlico':
			bundler = new PimlicoBundler(chainId, getBundlerUrl(chainId, 'pimlico'), options?.bundlerOptions)
			break
		case 'alchemy':
			bundler = new AlchemyBundler(chainId, getBundlerUrl(chainId, 'alchemy'), options?.bundlerOptions)
			break
		case 'etherspot':
			bundler = new EtherspotBundler(chainId, getBundlerUrl(chainId, 'etherspot'), options?.bundlerOptions)
			break
		default:
			bundler = new PimlicoBundler(chainId, getBundlerUrl(chainId, 'pimlico'), options?.bundlerOptions)
			break
	}

	if (optionAliases.includes('b')) {
		logger.info(`bundler: ${argv.bundler}, url: ${getBundlerUrl(chainId, argv.bundler)}`)
	}

	return {
		argv,
		client,
		chainId,
		signer,
		bundler,
	}
}
