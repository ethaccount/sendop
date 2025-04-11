import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { sendop, type Execution } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { connectEntryPointV08 } from '@/utils'
import { getAddress, Interface, JsonRpcProvider, toBeHex, toNumber, Wallet } from 'ethers'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { setup } from '../utils'

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

const PUBLIC_PAYMASTER_ADDRESS = '0xcb04730b8aA92B8fC0d1482A0a7BD3420104556D'

const network = argv.network === 'sepolia' ? '11155111' : 'local'
const { logger, chainId, CLIENT_URL, account0, BUNDLER_URL } = await setup({ chainId: network })
logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(process.env.PRIVATE_KEY as string)
const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	entryPointVersion: 'v0.8',
	parseError: true,
	debug: true,
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
			return DUMMY_ECDSA_SIGNATURE
		},
		getSignature: async (userOpHash: Uint8Array) => {
			return await signer.signMessage(userOpHash)
		},
	},
	pmGetter: new PublicPaymaster(PUBLIC_PAYMASTER_ADDRESS),
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
