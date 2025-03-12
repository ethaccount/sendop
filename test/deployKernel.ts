import { ECDSA_VALIDATOR, CHARITY_PAYMASTER } from '@/address'
import { ECDSAValidatorModule, Kernel, PimlicoBundler, sendop } from '@/index'
import { hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { MyPaymaster, setup } from './utils'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup({ chainId: '11155111' })

logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)

const creationOptions = {
	salt: hexlify(randomBytes(32)), // random salt
	validatorAddress: ECDSA_VALIDATOR,
	initData: await signer.getAddress(),
}

logger.info(`Salt: ${creationOptions.salt}`)

const deployedAddress = await Kernel.getNewAddress(client, creationOptions)

const kernel = new Kernel(deployedAddress, {
	client,
	bundler: new PimlicoBundler(chainId, BUNDLER_URL),
	erc7579Validator: new ECDSAValidatorModule({
		address: ECDSA_VALIDATOR,
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
		paymasterAddress: CHARITY_PAYMASTER,
	}),
})

logger.info(`hash: ${op.hash}`)
await op.wait()
logger.info('deployed address: ', deployedAddress)
