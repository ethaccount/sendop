import fs from 'fs'
import path from 'path'
import { logger } from './common'

// Recursively find all factory files
function findFactoryFiles(dir: string): string[] {
	const files: string[] = []
	const entries = fs.readdirSync(dir, { withFileTypes: true })

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			files.push(...findFactoryFiles(fullPath))
		} else if (entry.name.endsWith('__factory.ts')) {
			files.push(fullPath)
		}
	}

	return files
}

// Read all factory files from contract-types directory
const factoriesPath = path.join(__dirname, '../src/contract-types/factories')
const factoryFiles = findFactoryFiles(factoriesPath)
	.map(file => path.relative(factoriesPath, file)) // Get relative path
	.map(file => file.replace('.ts', '')) // Remove .ts extension

// Create import statements
const imports = factoryFiles
	.map(factory => `import { ${path.basename(factory)} } from '@/contract-types/factories/${factory}';`)
	.join('\n')

// Create interface mappings
const interfaceEntries = factoryFiles
	.map(
		factory =>
			`    ${path.basename(factory).replace('__factory', '')}: ${path.basename(factory)}.createInterface()`,
	)
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

logger.success(`${outputPath} generated successfully!`)
