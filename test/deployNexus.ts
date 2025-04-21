import { ADDRESS } from '@/addresses'
import {
	BICONOMY_ATTESTER_ADDRESS,
	EOAValidatorModule,
	PublicPaymaster,
	RHINESTONE_ATTESTER_ADDRESS,
	sendop,
} from '@/index'
import { NexusAccount } from '@/smart-accounts/nexus/NexusAccount'
import type { NexusCreationOptions } from '@/smart-accounts/nexus/types'
import { hexlify, randomBytes } from 'ethers'
import { logger } from './utils'
import { setupCLI } from './utils/cli'

const { signer, bundler, client } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
	},
})

const creationOptions: NexusCreationOptions = {
	bootstrap: 'initNexusWithSingleValidator',
	salt: hexlify(randomBytes(32)),
	validatorAddress: ADDRESS.ECDSAValidator,
	validatorInitData: await signer.getAddress(),
	registryAddress: ADDRESS.Registry,
	attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
	threshold: 1,
}
logger.info(`salt: ${creationOptions.salt}`)

const computedAddress = await NexusAccount.computeAccountAddress(client, creationOptions)
logger.info('computedAddress:', computedAddress)

const nexus = new NexusAccount({
	address: computedAddress,
	client,
	bundler,
	validator: new EOAValidatorModule({
		address: ADDRESS.ECDSAValidator,
		signer,
	}),
})

const op = await sendop({
	bundler,
	executions: [],
	opGetter: nexus,
	initCode: nexus.getInitCode(creationOptions),
	pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
})

logger.info(`hash: ${op.hash}`)

const receipt = await op.wait()
logger.info('deployed address:', computedAddress)
logger.info('receipt:', JSON.stringify(receipt, null, 2))
