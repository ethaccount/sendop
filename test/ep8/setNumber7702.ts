import { ADDRESS } from '@/addresses'
import { SkandhaBundler } from '@/bundlers'
import { sendop, type Execution } from '@/core'
import { connectEntryPointV08 } from '@/utils'
import { getAddress, Interface, JsonRpcProvider, toBeHex, toNumber } from 'ethers'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { MyPaymaster, setup } from '../utils'

const argv = await yargs(hideBin(process.argv))
	.option('network', {
		alias: 'n',
		choices: ['local', 'sepolia'] as const,
		description: 'Network (local or sepolia)',
		demandOption: true,
	})
	.option('address', {
		alias: 'a',
		type: 'string',
		description: 'Address',
		demandOption: true,
	})
	.help().argv

const network = argv.network === 'sepolia' ? '11155111' : 'local'
const { logger, chainId, CLIENT_URL, account0 } = await setup({ chainId: network })
logger.info(`Chain ID: ${chainId}`)

const signer = account0
const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new SkandhaBundler(chainId, 'http://localhost:14337/rpc', {
	entryPointVersion: 'v0.8',
	parseError: true,
	async onBeforeEstimation(userOp) {
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
	opGetter: {
		getSender: () => argv.address,
		getNonce: async () => {
			return toBeHex(await connectEntryPointV08(client).getNonce(argv.address, 0))
		},
		getCallData: (executions: Execution[]) => {
			if (!executions.length) {
				return '0x'
			}

			if (executions.length === 1) {
				const execution = executions[0]
				return new Interface([
					'function execute(address target, uint256 value, bytes calldata data)',
				]).encodeFunctionData('execute', [execution.to, execution.value, execution.data])
			}

			// TODO: function executeBatch(Call[] calldata calls)
			throw new Error('Not supported')
		},
		getDummySignature: () => {
			return 'DUMMY_ECDSA_SIGNATURE'
		},
		getSignature: (userOpHash: Uint8Array) => {
			return signer.signMessage(userOpHash)
		},
	},
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
