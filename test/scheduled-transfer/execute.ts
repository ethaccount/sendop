import { ADDRESS } from '@/addresses'
import { PimlicoBundler, PublicPaymaster } from '@/index'
import { JsonRpcProvider } from 'ethers'
import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { setup } from '../../test/utils'
import { executeScheduledTransfer } from './executeScheduledTransfer'

const argv = await yargs(hideBin(process.argv))
	.option('network', {
		alias: 'n',
		choices: ['local', 'sepolia'] as const,
		description: 'Network (local or sepolia)',
		demandOption: true,
	})
	.help().argv

const CHAIN_IDS = {
	local: 1337n,
	sepolia: 11155111n,
} as const
const chainId = CHAIN_IDS[argv.network]
const { logger, CLIENT_URL, BUNDLER_URL, account1 } = await setup({ chainId })

const jobId = 1n
const permissionId = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'
const kernelAddress = fs.readFileSync(path.join(__dirname, 'deployed-address.txt'), 'utf8')
logger.info(`Kernel address: ${kernelAddress}`)

logger.info(`Chain ID: ${chainId}`)

const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	parseError: true,
	// async onBeforeEstimation(userOp) {
	// 	logger.info('onBeforeEstimation', userOp)
	// 	return userOp
	// },
	// async onBeforeSendUserOp(userOp) {
	// 	logger.info('onBeforeSendUserOp', userOp)
	// 	return userOp
	// },
	// debugSend: true,
})

const pmGetter = new PublicPaymaster(ADDRESS.PublicPaymaster)

const receipt = await executeScheduledTransfer({
	accountAddress: kernelAddress,
	permissionId,
	jobId: jobId,
	client,
	bundler,
	pmGetter,
	sessionSigner: account1,
})

logger.info(`Execution success: ${receipt.success}`)
