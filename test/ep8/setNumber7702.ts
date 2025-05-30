import { ADDRESS } from '@/addresses'
import { sendop } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { Simple7702Account } from '@/smart-accounts/Simple7702Account'
import { getAddress, Interface, toNumber } from 'ethers'
import { logger } from 'test/utils'
import { setupCLI } from 'test/utils/cli'

// bun run test/ep8/setNumber7702.ts -r $sepolia -p $DEV_7702_PK

const { signer, bundler, client } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		entryPointVersion: 'v0.8',
		parseError: true,
		debug: true,
		async onBeforeEstimation(userOp) {
			return userOp
		},
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
	opGetter: new Simple7702Account({
		address: signer.address,
		client,
		bundler,
		signer,
	}),
	pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
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
}

logger.info(receipt)
