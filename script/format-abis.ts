import fs from 'fs'
import path from 'path'

const abisDir = path.join(__dirname, '../abis')

// Recursive function to process all directories
function processDirectory(dirPath: string) {
	const items = fs.readdirSync(dirPath)

	items.forEach(item => {
		const fullPath = path.join(dirPath, item)
		const stat = fs.statSync(fullPath)

		if (stat.isDirectory()) {
			// Recursively process subdirectories
			processDirectory(fullPath)
		} else if (item.endsWith('.json') && !item.startsWith('T')) {
			// Rename JSON files that don't start with T
			const dirName = path.dirname(fullPath)
			const newPath = path.join(dirName, `T${item}`)

			try {
				fs.renameSync(fullPath, newPath)
				console.log(`Renamed ${fullPath} to ${newPath}`)
			} catch (err) {
				console.error(`Error renaming ${fullPath}:`, err)
			}
		}
	})
}

// Start processing from root abis directory
processDirectory(abisDir)
