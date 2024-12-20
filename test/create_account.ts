import { sendop } from '@/sendop'
import { ECDSAValidator } from '@/validators/ecdsa_validator'
import { Kernel } from '@/vendors/kernel'
import { JsonRpcProvider, Wallet } from 'ethers'
import { MyPaymaster } from './utils/myPaymaster'
import { addresses } from './utils/network'
import { setup } from './utils/setup'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, PRIVATE_KEY, SALT } = setup()

const VALIDATOR_ADDRESS = addresses[chainId].ECDSA_VALIDATOR
const CHARITY_PAYMASTER_ADDRESS = addresses[chainId].CHARITY_PAYMASTER

const vendor = new Kernel()

const deployedAddress = await vendor.getAddress(
	new JsonRpcProvider(CLIENT_URL),
	VALIDATOR_ADDRESS,
	await new Wallet(PRIVATE_KEY).getAddress(),
	SALT,
)

logger.info('Chain ID', chainId)
logger.info(`Deployed address: ${deployedAddress}`)
const confirmed = prompt('Confirm? (y/n)')
if (confirmed !== 'y') {
	process.exit()
}

logger.info('Sending op...')
const op = await sendop({
	networkInfo: {
		chainId,
		clientUrl: CLIENT_URL,
		bundlerUrl: BUNDLER_URL,
	},
	validator: new ECDSAValidator({
		address: VALIDATOR_ADDRESS,
		clientUrl: CLIENT_URL,
		signer: new Wallet(PRIVATE_KEY),
	}),
	vendor,
	from: deployedAddress,
	executions: [],
	paymaster: new MyPaymaster({
		chainId,
		clientUrl: CLIENT_URL,
		paymasterAddress: CHARITY_PAYMASTER_ADDRESS,
	}),
})

logger.info('Waiting for receipt...')
const receipt = await op.wait()
logger.info(receipt)
