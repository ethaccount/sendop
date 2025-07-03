import { ADDRESS } from '@/addresses'
import { KernelV3Account, OwnableValidator, DeprecatedPublicPaymaster, randomBytes32, sendop } from '@/index'
import { logger, setupCLI } from './utils'

const { signer, bundler, client } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
	},
})

const creationOptions = {
	salt: randomBytes32(),
	validatorAddress: ADDRESS.OwnableValidator,
	validatorInitData: OwnableValidator.getInitData([signer.address], 1),
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
		validator: new OwnableValidator({
			signers: [signer],
		}),
	}),
	initCode: KernelV3Account.getInitCode(creationOptions),
	pmGetter: new DeprecatedPublicPaymaster(ADDRESS.PublicPaymaster),
})

logger.info(`hash: ${op.hash}`)

await op.wait()
logger.info('deployed address:', computedAddress)
