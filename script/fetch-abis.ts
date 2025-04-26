import { fetchABI, logger } from './common'
import addresses from './addresses.json'
import fs from 'fs'
import path from 'path'

async function main() {
	const network = 'sepolia'
	logger.info(`Fetching ABIs for ${network}...`)

	const noAbiAddresses: { name: string; address: string }[] = []
	const { 'fetch-abi': contractAddresses, 'skip-fetch-abi': skipFetchAbi } = addresses

	for (const [address, name] of Object.entries(contractAddresses)) {
		// Skip if in skipFetchAbi array
		if (skipFetchAbi.includes(name)) {
			logger.info(`Skipping ABI fetch for ${name} as configured`)
			continue
		}

		try {
			await fetchABI(address, network, name)
			logger.success(`Successfully fetched ABI for ${name}`)
		} catch (error) {
			logger.warn(`Failed to fetch ABI for ${name}:`, error)
			noAbiAddresses.push({ name, address })
		}
	}

	// Write failed fetches to a JSON file for gen-addresses.ts to use
	fs.writeFileSync(path.join(__dirname, 'failed-fetches.json'), JSON.stringify(noAbiAddresses, null, 2))

	logger.success('Done fetching ABIs')
	if (noAbiAddresses.length > 0) {
		logger.info(`${noAbiAddresses.length} addresses failed to fetch ABIs`)
	}
}

main().catch(logger.error)
