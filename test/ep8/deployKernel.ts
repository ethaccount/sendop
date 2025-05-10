import { ADDRESS } from '@/addresses'
import { EOAValidator, KernelV3Account, sendop, EtherspotBundler, PublicPaymaster } from '@/index'
import { hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { setup } from '../utils'

const { logger, chainId, CLIENT_URL, privateKey } = await setup({ chainId: 1337n })

logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)

const creationOptions = {
	salt: hexlify(randomBytes(32)), // random salt
	validatorAddress: ADDRESS.ECDSAValidator,
	validatorInitData: await signer.getAddress(),
}

logger.info(`salt: ${creationOptions.salt}`)

const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)
logger.info('computedAddress:', computedAddress)

const bundler = new EtherspotBundler(chainId, 'http://localhost:14337/rpc', {
	entryPointVersion: 'v0.8',
	parseError: true,
	debug: true,
	async onBeforeEstimation(userOp) {
		return userOp
	},
})

const kernel = new KernelV3Account({
	address: computedAddress,
	client,
	bundler,
	validator: new EOAValidator({
		address: ADDRESS.ECDSAValidator,
		signer,
	}),
})

const op = await sendop({
	bundler,
	executions: [],
	opGetter: kernel,
	initCode: kernel.getInitCode(creationOptions),
	pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
})

logger.info(`hash: ${op.hash}`)

await op.wait()
logger.info('deployed address:', computedAddress)
