import fs from 'fs'
import path from 'path'

// Read the addresses.json file
const addressesPath = path.join(__dirname, '../src', 'addresses.json')
const addressesData = fs.readFileSync(addressesPath, 'utf8')
const addressesRaw = JSON.parse(addressesData)

// Transform addresses object to have contract names as keys
const addresses: Record<string, string> = {}
Object.entries(addressesRaw).forEach(([address, name]) => {
	addresses[name as string] = address as string
})

// Create import statements
const imports = Object.keys(addresses)
	.map(name => `import { ${name}__factory } from '@/contract-types';`)
	.join('\n')

// Create interface mappings
const interfaceEntries = Object.keys(addresses)
	.map(name => `    ${name}: ${name}__factory.createInterface()`)
	.join(',\n')

// Create the output string
const output = `${imports}

const INTERFACES = {
${interfaceEntries}
};

export default INTERFACES;
`

// Write to a new file
const outputPath = path.join(__dirname, '../src', 'interfaces.ts')
fs.writeFileSync(outputPath, output)

console.log(`${outputPath} generated successfully!`)
