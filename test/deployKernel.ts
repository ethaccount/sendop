import ADDRESS from '@/addresses'
import { ECDSAValidatorModule, KernelV3Account, PimlicoBundler, sendop } from '@/index'
import { hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { MyPaymaster, setup } from './utils'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup({ chainId: 'local' })

logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)

const creationOptions = {
	salt: hexlify(randomBytes(32)), // random salt
	validatorAddress: ADDRESS.ECDSAValidator,
	initData: await signer.getAddress(),
}

logger.info(`Salt: ${creationOptions.salt}`)

const deployedAddress = await KernelV3Account.getNewAddress(client, creationOptions)

const kernel = new KernelV3Account(deployedAddress, {
	client,
	bundler: new PimlicoBundler(chainId, BUNDLER_URL),
	erc7579Validator: new ECDSAValidatorModule({
		address: ADDRESS.ECDSAValidator,
		client,
		signer,
	}),
})

const op = await sendop({
	bundler: new PimlicoBundler(chainId, BUNDLER_URL),
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
logger.info('deployed address: ', deployedAddress)
