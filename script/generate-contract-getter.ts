import * as fs from 'fs'
import * as path from 'path'

// Read the address.ts file and parse the constants
function parseAddressFile(filePath: string): Map<string, string> {
	const content = fs.readFileSync(filePath, 'utf-8')
	const addresses = new Map<string, string>()

	const exportLines = content.split('\n').filter(line => line.includes('export const'))

	for (const line of exportLines) {
		const match = line.match(/export const (\w+)\s*=\s*['"]([^'"]+)['"]/)
		if (match && !line.includes('TODO')) {
			const [, name, address] = match
			addresses.set(name, address)
		}
	}

	return addresses
}

// Convert constant name to camelCase function name
function toFunctionName(constName: string): string {
	return (
		'connect' +
		constName
			.split('_')
			.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
			.join('')
	)
}

// Convert constant name to factory name
function toFactoryName(constName: string): string {
	return (
		constName
			.split('_')
			.map(part => {
				// Preserve "ERC" as uppercase
				if (part.toUpperCase() === 'ERC20') {
					return 'ERC20'
				}
				return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
			})
			.join('') + '__factory'
	)
}

function generateContractGettersFile(addresses: Map<string, string>): string {
	const imports = [`import {`]
	const factoryImports = [`import {`]
	const functions: string[] = []

	// Add ContractRunner import
	imports.push(`  ${Array.from(addresses.keys()).join(',\n  ')}`)
	imports.push(`} from '@/address'`)
	imports.push('')

	// Add factory imports
	factoryImports.push(
		`  ${Array.from(addresses.keys())
			.map(name => toFactoryName(name))
			.join(',\n  ')}`,
	)
	factoryImports.push(`} from '@/contract-types'`)
	factoryImports.push('')
	factoryImports.push("import type { ContractRunner } from 'ethers'")
	factoryImports.push('')

	// Generate connect functions
	for (const [name] of addresses) {
		const functionName = toFunctionName(name)
		const factoryName = toFactoryName(name)

		functions.push(`export function ${functionName}(runner: ContractRunner) {`)
		functions.push(`  return ${factoryName}.connect(${name}, runner)`)
		functions.push(`}`)
		functions.push('')
	}

	return [...imports, ...factoryImports, ...functions].join('\n')
}

// Main execution
const addressFilePath = path.join(__dirname, '..', 'src', 'address.ts')
const contractsFilePath = path.join(__dirname, '..', 'src', 'utils', 'contract-getter.ts')

const addresses = parseAddressFile(addressFilePath)
const generatedContent = generateContractGettersFile(addresses)

// Create directories if they don't exist
const dir = path.dirname(contractsFilePath)
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir, { recursive: true })
}

// Write the generated file
fs.writeFileSync(contractsFilePath, generatedContent)
console.log(`Generated: ${contractsFilePath}`)
