import { config } from 'dotenv'
import fs from 'fs/promises'
import path from 'path'

config()

const API_KEY = process.env.ETHERSCAN_API_KEY as string
if (!API_KEY) {
	throw new Error('ETHERSCAN_API_KEY not found in env')
}

const NETWORK_ENDPOINTS = {
	mainnet: 'https://api.etherscan.io/api',
	sepolia: 'https://api-sepolia.etherscan.io/api',
} as const

export type Network = keyof typeof NETWORK_ENDPOINTS

export interface EtherscanResponse {
	status: string
	message: string
	result: string
}

export interface SourceCodeResponse {
	status: string
	message: string
	result: [
		{
			ContractName: string
			// other fields exist but we only need ContractName
		},
	]
}

export async function getContractName(address: string, network: Network): Promise<string> {
	const endpoint = NETWORK_ENDPOINTS[network]
	const url = new URL(endpoint)
	url.searchParams.append('module', 'contract')
	url.searchParams.append('action', 'getsourcecode')
	url.searchParams.append('address', address)
	url.searchParams.append('apikey', API_KEY)

	const response = await fetch(url)
	const data = (await response.json()) as SourceCodeResponse

	if (data.status === '0') {
		throw new Error(`Error fetching contract name: ${data.message}`)
	}

	return data.result[0].ContractName
}

async function fetchABIFromNetwork(address: string, network: Network): Promise<EtherscanResponse> {
	const url = new URL(NETWORK_ENDPOINTS[network])
	url.searchParams.append('module', 'contract')
	url.searchParams.append('action', 'getabi')
	url.searchParams.append('address', address)
	url.searchParams.append('apikey', API_KEY)

	const response = await fetch(url)
	return (await response.json()) as EtherscanResponse
}

export async function fetchABI(address: string, network: Network, contractName: string, output: string = 'src/abis') {
	const isFilePath = output.endsWith('.json')
	const outputPath = isFilePath ? output : path.join(output, `${contractName}.json`)

	// Try primary network first
	let data = await fetchABIFromNetwork(address, network)

	// If failed and not on mainnet, try mainnet as fallback
	if (data.status === '0' && network !== 'mainnet') {
		console.log('Retrying fetch on mainnet...')
		data = await fetchABIFromNetwork(address, 'mainnet')
	}

	// Final status check
	if (data.status === '0') {
		throw new Error(`Error fetching ABI on ${network === 'mainnet' ? 'mainnet' : `${network} and mainnet`}`)
	}

	if (!data.result.startsWith('[')) {
		throw new Error('Invalid or unverified contract ABI')
	}

	const abi = JSON.parse(data.result)
	const result = JSON.stringify({ abi }, null, 4)

	// Ensure the output directory exists
	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, result)

	console.log(`ABI written to ${outputPath}`)
}
