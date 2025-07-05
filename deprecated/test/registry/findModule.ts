import { connectRegistry } from '@/utils'
import { setupCLI } from 'test/utils'

// bun run test/registry/findModule.ts -r $sepolia -a 0x00000000002b0ecfbd0496ee71e01257da0e37de

const { argv, client } = await setupCLI(['r', 'a'])

const registry = connectRegistry(client)
const moduleRecord = await registry.findModule(argv.address)

console.log('resolverUID', moduleRecord.resolverUID)
console.log('sender', moduleRecord.sender)
console.log('metadata', moduleRecord.metadata)
