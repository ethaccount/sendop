import fs from 'fs'
import path from 'path'
import { logger } from './common'

// Read the addresses.json file
const addressesPath = path.join(__dirname, './', 'addresses.json')
const addressesData = fs.readFileSync(addressesPath, 'utf8')
const { 'fetch-abi': addresses, 'skip-fetch-abi': skipFetchAbi } = JSON.parse(addressesData)

// Read failed fetches if exists
let failedFetches: { name: string; address: string }[] = []
const failedFetchesPath = path.join(__dirname, 'failed-fetches.json')
if (fs.existsSync(failedFetchesPath)) {
	failedFetches = JSON.parse(fs.readFileSync(failedFetchesPath, 'utf8'))
}

// Transform the data into the desired format
const transformedAddresses: Record<string, string> = {}
Object.entries(addresses).forEach(([address, name]) => {
	transformedAddresses[name as string] = address
})

// Generate no-abi addresses combining skip-fetch and failed fetches
const noAbiAddresses: Record<string, string> = {}
skipFetchAbi.forEach((name: string) => {
	noAbiAddresses[name] = transformedAddresses[name]
})
failedFetches.forEach(({ name, address }) => {
	noAbiAddresses[name] = address
})

// Create the outputs
const addressesOutput = `export const ADDRESS = ${JSON.stringify(transformedAddresses, null, 4)};`
const noAbiJson = JSON.stringify(noAbiAddresses, null, 4)

// Write to files
const srcDir = path.join(__dirname, '../src')
const scriptDir = __dirname

// Write addresses.ts to src
fs.writeFileSync(path.join(srcDir, 'addresses.ts'), addressesOutput)

// Write non-auto-fetched-abi-addresses.json to script/
fs.writeFileSync(path.join(scriptDir, 'non-auto-fetched-abi-addresses.json'), noAbiJson)

logger.success(`Generated addresses.ts and non-auto-fetched-abi-addresses.json successfully!`)

// Clean up failed-fetches.json
if (fs.existsSync(failedFetchesPath)) {
	fs.unlinkSync(failedFetchesPath)
}
