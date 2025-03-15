import ADDRESS from '@/addresses'
import {
	BICONOMY_ATTESTER_ADDRESS,
	EOAValidatorModule,
	PimlicoBundler,
	RHINESTONE_ATTESTER_ADDRESS,
	sendop,
} from '@/index'
import { NexusAccount } from '@/smart-accounts/nexus/NexusAccount'
import type { NexusCreationOptions } from '@/smart-accounts/nexus/types'
import { hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { MyPaymaster, setup } from './utils'

const argv = await yargs(hideBin(process.argv))
	.option('network', {
		alias: 'n',
		choices: ['local', 'sepolia'] as const,
		description: 'Network (local or sepolia)',
		demandOption: true,
	})
	.help().argv
const network = argv.network === 'sepolia' ? '11155111' : 'local'
const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup({ chainId: network })
logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	// debugHandleOps: true,
	async onBeforeEstimation(userOp) {
		// logger.info('onBeforeEstimation', userOp)
		return userOp
	},
})

const creationOptions: NexusCreationOptions = {
	bootstrap: 'initNexusWithSingleValidator',
	salt: hexlify(randomBytes(32)),
	validatorAddress: ADDRESS.K1Validator,
	validatorInitData: await signer.getAddress(),
	registryAddress: ADDRESS.Registry,
	attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
	threshold: 1,
}
logger.info(`salt: ${creationOptions.salt}`)

const computedAddress = await NexusAccount.getNewAddress(client, creationOptions)
logger.info('computedAddress:', computedAddress)

const nexus = new NexusAccount({
	address: computedAddress,
	client,
	bundler,
	erc7579Validator: new EOAValidatorModule({
		address: ADDRESS.K1Validator,
		signer,
	}),
})

const op = await sendop({
	bundler,
	executions: [],
	opGetter: nexus,
	initCode: nexus.getInitCode(creationOptions),
	pmGetter: new MyPaymaster({
		client,
		paymasterAddress: ADDRESS.CharityPaymaster,
	}),
})

logger.info(`hash: ${op.hash}`)

await op.wait()
logger.info('deployed address:', computedAddress)
