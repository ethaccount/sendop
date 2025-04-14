import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { sendop } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { Simple7702Account } from '@/smart-accounts/Simple7702Account'
import { getAddress, Interface, JsonRpcProvider, toNumber, Wallet } from 'ethers'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { getBundlerUrl, logger } from '../utils'

const argv = await yargs(hideBin(process.argv))
	.option('rpc-url', {
		alias: 'r',
		type: 'string',
		description: 'RPC URL',
		demandOption: true,
	})
	.option('private-key', {
		alias: 'p',
		type: 'string',
		description: 'Private key',
		demandOption: true,
	})
	.help().argv

const PUBLIC_PAYMASTER_ADDRESS = '0xcb04730b8aA92B8fC0d1482A0a7BD3420104556D'

const client = new JsonRpcProvider(argv.rpcUrl)
const chainId = await client.getNetwork().then(network => network.chainId)
const signer = new Wallet(argv.privateKey)

const bundler = new PimlicoBundler(chainId, getBundlerUrl(chainId, 'pimlico'), {
	entryPointVersion: 'v0.8',
	parseError: true,
	debug: true,
	async onBeforeEstimation(userOp) {
		return {
			...userOp,
			maxFeePerGas: (userOp.maxFeePerGas * 130n) / 100n,
			maxPriorityFeePerGas: (userOp.maxPriorityFeePerGas * 130n) / 100n,
		}
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
	// TODO: what's the situation to use 7702 initCode?
	// initCode: zeroPadRight('0x7702', 20),
	opGetter: new Simple7702Account({
		address: signer.address,
		client,
		bundler,
		signer,
	}),
	pmGetter: new PublicPaymaster(PUBLIC_PAYMASTER_ADDRESS),
})

console.log('opHash', op.hash)

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
}

logger.info(receipt)
