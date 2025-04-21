import { ADDRESS } from '@/addresses'
import {
	BICONOMY_ATTESTER_ADDRESS,
	ERC7579_MODULE_TYPE,
	INTERFACES,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579Account,
	Safe7579Launchpad__factory,
	SafeProxyFactory__factory,
	type Safe7579CreationOptions,
} from '@/index'
import { ZeroAddress } from 'ethers'
import { logger } from './utils'
import { setupCLI } from './utils/cli'

const { signer, bundler, client } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
	},
})

const salt = '0x064bf365f08bac12d15b38a6d4b3e6bf160ac5720d5a0b3a86845e17a87f84c5'

const creationOptions: Safe7579CreationOptions = {
	salt,
	validatorAddress: ADDRESS.ECDSAValidator,
	validatorInitData: signer.address,
	owners: [signer.address],
	ownersThreshold: 1,
	attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
	attestersThreshold: 1,
}
logger.info(`salt: ${creationOptions.salt}`)

const computedAddress = await Safe7579Account.getNewAddress(client, creationOptions)
logger.info('computedAddress:', computedAddress)

// const nexus = new NexusAccount({
// 	address: computedAddress,
// 	client,
// 	bundler,
// 	validator: new EOAValidatorModule({
// 		address: ADDRESS.ECDSAValidator,
// 		signer,
// 	}),
// })

// const op = await sendop({
// 	bundler,
// 	executions: [],
// 	opGetter: nexus,
// 	initCode: nexus.getInitCode(creationOptions),
// 	pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
// })

// logger.info(`hash: ${op.hash}`)

// const receipt = await op.wait()
// logger.info('deployed address:', computedAddress)
// logger.info('receipt:', JSON.stringify(receipt, null, 2))
