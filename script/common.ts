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

async function tryGetContractName(address: string, network: Network): Promise<string> {
	try {
		return await getContractName(address, network)
	} catch (error) {
		throw new Error(`Failed to get contract name on ${network}: ${error}`)
	}
}

export async function fetchABI(address: string, network: Network, output: string = 'src/abis') {
	// Try to get contract name from specified network, fallback to mainnet
	let contractName: string
	let effectiveNetwork = network

	try {
		contractName = await tryGetContractName(address, network)
		if (!contractName) {
			throw new Error('Contract name is empty')
		}
	} catch (error) {
		if (network !== 'mainnet') {
			console.log('Retrying contract name fetch on mainnet...')
			contractName = await tryGetContractName(address, 'mainnet')
			effectiveNetwork = 'mainnet'
		} else {
			throw error
		}
	}

	const endpoint = NETWORK_ENDPOINTS[effectiveNetwork]
	const isFilePath = output.endsWith('.json')
	const outputPath = isFilePath ? output : path.join(output, `${contractName}.json`)

	const url = new URL(endpoint)
	url.searchParams.append('module', 'contract')
	url.searchParams.append('action', 'getabi')
	url.searchParams.append('address', address)
	url.searchParams.append('apikey', API_KEY)

	const response = await fetch(url)
	const data = (await response.json()) as EtherscanResponse

	if (data.status === '0') {
		throw new Error(`Error fetching ABI on ${effectiveNetwork}: ${data.message}`)
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
