import { ADDRESS } from '@/addresses'
import { EOAValidatorModule, KernelV3Account, PimlicoBundler, sendop } from '@/index'
import { hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { MyPaymaster, setup } from './utils'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup({ chainId: 'local' })

logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)

const creationOptions = {
	salt: hexlify(randomBytes(32)), // random salt
	validatorAddress: ADDRESS.K1Validator,
	validatorInitData: await signer.getAddress(),
}

logger.info(`salt: ${creationOptions.salt}`)

const computedAddress = await KernelV3Account.getNewAddress(client, creationOptions)
logger.info('computedAddress:', computedAddress)

const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	debug: true,
	async onBeforeEstimation(userOp) {
		// logger.info('onBeforeEstimation', userOp)
		return userOp
	},
})

const kernel = new KernelV3Account({
	address: computedAddress,
	client,
	bundler,
	validator: new EOAValidatorModule({
		address: ADDRESS.K1Validator,
		signer,
	}),
})

const op = await sendop({
	bundler,
	executions: [],
	opGetter: kernel,
	initCode: kernel.getInitCode(creationOptions),
	pmGetter: new MyPaymaster({
		client,
		paymasterAddress: ADDRESS.CharityPaymaster,
	}),
})

logger.info(`hash: ${op.hash}`)

await op.wait()
logger.info('deployed address:', computedAddress)
