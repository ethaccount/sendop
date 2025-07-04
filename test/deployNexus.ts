import { ADDRESS } from '@/addresses'
import {
	BICONOMY_ATTESTER_ADDRESS,
	OwnableValidator,
	DeprecatedPublicPaymaster,
	RHINESTONE_ATTESTER_ADDRESS,
	sendop,
} from '@/index'
import { Nexus } from '@/accounts/nexus'
import type { NexusCreationOptions } from '@/accounts/nexus'
import { hexlify, randomBytes } from 'ethers'
import { logger, setupCLI } from './utils'

const { signer, bundler, client } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
	},
})

const creationOptions: NexusCreationOptions = {
	bootstrap: 'initNexusWithSingleValidator',
	salt: hexlify(randomBytes(32)),
	validatorAddress: ADDRESS.OwnableValidator,
	validatorInitData: OwnableValidator.getInitData([signer.address], 1),
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
	validator: new OwnableValidator({
		signers: [signer],
	}),
})

const op = await sendop({
	bundler,
	executions: [],
	opGetter: nexus,
	initCode: nexus.getInitCode(creationOptions),
	pmGetter: new DeprecatedPublicPaymaster(ADDRESS.PublicPaymaster),
})

logger.info(`hash: ${op.hash}`)

const receipt = await op.wait()
logger.info('deployed address:', computedAddress)
logger.info('receipt:', JSON.stringify(receipt, null, 2))
