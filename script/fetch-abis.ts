import { fetchABI } from './common'
import addresses from '../src/addresses.json'

async function main() {
	const network = 'sepolia'
	console.log(`Fetching ABIs for ${network}...`)

	for (const address of Object.keys(addresses)) {
		const name = addresses[address as keyof typeof addresses]

		try {
			await fetchABI(address, network, name)
			console.log(`Successfully fetched ABI for ${name}`)
		} catch (error) {
			console.error(`Failed to fetch ABI for ${name}:`, error)
			break
		}
	}

	console.log('Done fetching ABIs')
}

main().catch(console.error)
