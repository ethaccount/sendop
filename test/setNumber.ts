import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers/PimlicoBundler'
import { sendop } from '@/core'
import { NexusAccount } from '@/smart-accounts/nexus/NexusAccount'
import { EOAValidatorModule } from '@/validators/EOAValidatorModule'
import { getAddress, Interface, JsonRpcProvider, toNumber, Wallet } from 'ethers'
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
	// address
	.option('address', {
		alias: 'a',
		type: 'string',
		description: 'Address',
		demandOption: true,
	})
	.help().argv
const network = argv.network === 'sepolia' ? '11155111' : 'local'
const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup({ chainId: network })
logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	parseError: true,
	debugSend: true,
	// debugSend: true,
	async onBeforeEstimation(userOp) {
		// logger.info('onBeforeEstimation', userOp)
		return userOp
	},
})

const number = Math.floor(Math.random() * 10000)
logger.info(`Setting number to ${number}`)

logger.info('Sending op...')
const op = await sendop({
	bundler,
	executions: [
		{
			to: ADDRESS.Counter,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
			value: 0n,
		},
	],
	opGetter: new NexusAccount({
		address: argv.address,
		client,
		bundler,
		validator: new EOAValidatorModule({
			address: ADDRESS.K1Validator,
			signer,
		}),
	}),
	pmGetter: new MyPaymaster({
		client,
		paymasterAddress: ADDRESS.CharityPaymaster,
	}),
})

const startTime = Date.now()
logger.info('Waiting for receipt...')
const receipt = await op.wait()
const duration = (Date.now() - startTime) / 1000 // Convert to seconds
logger.info(`Receipt received after ${duration.toFixed(2)} seconds`)

const log = receipt.logs.find(log => getAddress(log.address) === getAddress(ADDRESS.Counter))
if (log && toNumber(log.data) === number) {
	logger.info(`Number ${number} set successfully`)
} else {
	logger.error(`Number ${number} not set`)
	logger.info(receipt)
}
