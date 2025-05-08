import { ADDRESS } from '@/addresses'
import { EOAValidator, KernelV3Account, PublicPaymaster, randomBytes32, sendop } from '@/index'
import { logger } from './utils'
import { setupCLI } from './utils/cli'

const { signer, bundler, client } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
		async onBeforeEstimation(userOp) {
			return userOp
		},
	},
})

const creationOptions = {
	salt: randomBytes32(),
	validatorAddress: ADDRESS.ECDSAValidator,
	validatorInitData: signer.address,
}

logger.info(`salt: ${creationOptions.salt}`)

const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)
logger.info('computedAddress:', computedAddress)

const op = await sendop({
	bundler,
	executions: [],
	opGetter: new KernelV3Account({
		address: computedAddress,
		client,
		bundler,
		validator: new EOAValidator({
			address: ADDRESS.ECDSAValidator,
			signer,
		}),
	}),
	initCode: KernelV3Account.getInitCode(creationOptions),
	pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
})

logger.info(`hash: ${op.hash}`)

await op.wait()
logger.info('deployed address:', computedAddress)
