import fs from 'fs'
import path from 'path'

// Read the addresses.json file
const addressesPath = path.join(__dirname, '../src', 'addresses.json')
const addressesData = fs.readFileSync(addressesPath, 'utf8')
const addresses = JSON.parse(addressesData)

// Transform the data into the desired format
const transformedAddresses: Record<string, string> = {}
Object.entries(addresses).forEach(([address, name]) => {
	transformedAddresses[name as string] = address as string
})

// Create the output string
const output = `const ADDRESS = ${JSON.stringify(transformedAddresses, null, 4)};\n\nexport default ADDRESS;`

// Write to a new file
const outputPath = path.join(__dirname, '../src', 'addresses.ts')
fs.writeFileSync(outputPath, output)

console.log(`${outputPath} generated successfully!`)
