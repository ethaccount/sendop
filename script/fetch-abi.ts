import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { fetchABI } from './common'

// bun run script/fetch-abi.ts -a 0x000000000069E2a187AEFFb852bF3cCdC95151B2 -n sepolia

async function main() {
	const argv = await yargs(hideBin(process.argv))
		.option('addr', {
			alias: 'a',
			type: 'string',
			description: 'Contract address',
			demandOption: true,
		})
		.option('network', {
			alias: 'n',
			choices: ['mainnet', 'sepolia'] as const,
			description: 'Network (mainnet or sepolia)',
			demandOption: true,
		})
		.option('output', {
			alias: 'o',
			type: 'string',
			description: 'Output file path or directory (default: src/abis)',
			default: 'src/abis',
		})
		.help().argv

	await fetchABI(argv.addr, argv.network, argv.output)
}

main().catch(console.error)
