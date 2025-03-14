import { connectRegistry } from '@/utils'
import { JsonRpcProvider } from 'ethers'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

// bun run test/registry/findModule.ts -a 0x00000000002b0ecfbd0496ee71e01257da0e37de -n sepolia

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
		.help().argv

	const rpc = process.env[argv.network] as string
	const client = new JsonRpcProvider(rpc)
	const registry = connectRegistry(client)
	const moduleRecord = await registry.findModule(argv.addr)

	console.log('resolverUID', moduleRecord.resolverUID)
	console.log('sender', moduleRecord.sender)
	console.log('metadata', moduleRecord.metadata)
}

main().catch(console.error)
