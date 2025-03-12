import { ECDSA_VALIDATOR, CHARITY_PAYMASTER } from '@/address'
import { ECDSAValidatorModule, Kernel, PimlicoBundler, sendop } from '@/index'
import { hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { MyPaymaster, setup } from '../utils'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup({ chainId: 'local' })

logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)

const creationOptions = {
	salt: hexlify(randomBytes(32)), // random salt
	validatorAddress: ECDSA_VALIDATOR,
	initData: await signer.getAddress(),
}

logger.info(`Salt: ${creationOptions.salt}`)

const computedAddress = await Kernel.getNewAddress(client, creationOptions)

const kernel = new Kernel(computedAddress, {
	client,
	bundler: new PimlicoBundler(chainId, BUNDLER_URL, {
		onBeforeSendUserOp: async userOp => {
			console.log(userOp)
			return userOp
		},
	}),
	erc7579Validator: new ECDSAValidatorModule({
		address: ECDSA_VALIDATOR,
		client,
		signer,
	}),
	pmGetter: new MyPaymaster({
		client,
		paymasterAddress: CHARITY_PAYMASTER,
	}),
})

const op = await kernel.deploy(creationOptions)
logger.info(`hash: ${op.hash}`)

await op.wait()
logger.info('address:', computedAddress)
