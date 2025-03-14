import { fetchABI, logger } from './common'
import addresses from '../src/addresses.json'
import fs from 'fs'
import path from 'path'

async function main() {
	const network = 'sepolia'
	logger.info(`Fetching ABIs for ${network}...`)

	const noAbiAddresses: { name: string; address: string }[] = []

	for (const address of Object.keys(addresses)) {
		const name = addresses[address as keyof typeof addresses]

		try {
			await fetchABI(address, network, name)
			logger.success(`Successfully fetched ABI for ${name}`)
		} catch (error) {
			logger.warn(`Failed to fetch ABI for ${name}:`, error)
			noAbiAddresses.push({ name, address })
		}
	}

	// Save addresses without ABIs to file in the same format as addresses.ts
	const addressEntries = noAbiAddresses.map(({ name, address }) => `\t${name}: '${address}'`).join(',\n')

	const noAbiContent = `const NO_ABI_ADDRESS = {\n${addressEntries}\n}\n\nexport default NO_ABI_ADDRESS`
	fs.writeFileSync(path.join(__dirname, '../src/no-abi-addresses.ts'), noAbiContent)

	logger.success('Done fetching ABIs')
	if (noAbiAddresses.length > 0) {
		logger.info(`${noAbiAddresses.length} addresses without ABIs saved to no-abi-addresses.ts`)
	}
}

main().catch(logger.error)
