import { DEV_ATTESTER_ADDRESS, RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { connectRegistry } from '@/utils'
import { setupCLI } from 'test/utils'

// bun run test/registry/findAttestation.ts -r $sepolia -a 0x00000000002b0ecfbd0496ee71e01257da0e37de

const { argv, client } = await setupCLI(['r', 'a'])

const registry = connectRegistry(client)
const attestationRecord = await registry.findAttestation(argv.address, RHINESTONE_ATTESTER_ADDRESS)

if (Number(attestationRecord.time) === 0) {
	console.log('Module is not attested')
} else {
	console.log('Attestation Record:', {
		time: attestationRecord.time,
		expirationTime: attestationRecord.expirationTime,
		revocationTime: attestationRecord.revocationTime,
		moduleTypes: attestationRecord.moduleTypes,
		moduleAddress: attestationRecord.moduleAddress,
		attester: attestationRecord.attester,
		dataPointer: attestationRecord.dataPointer,
		schemaUID: attestationRecord.schemaUID,
	})
}
