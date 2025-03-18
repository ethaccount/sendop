import { ADDRESS } from '@/addresses'
import { ScheduledTransfers__factory } from '@/contract-types'
import { JsonRpcProvider } from 'ethers'
import fs from 'fs'
import path from 'path'
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
	.help().argv

const network = argv.network === 'sepolia' ? '11155111' : 'local'

const { logger, chainId, CLIENT_URL } = await setup({ chainId: network })

const kernelAddress = fs.readFileSync(path.join(__dirname, 'deployed-address.txt'), 'utf8')
const jobId = 1

logger.info(`Chain ID: ${chainId}`)
logger.info(`Kernel address: ${kernelAddress}`)

const client = new JsonRpcProvider(CLIENT_URL)
const scheduledTransfers = ScheduledTransfers__factory.connect(ADDRESS.ScheduledTransfers, client)

const jobCount = await scheduledTransfers.accountJobCount(kernelAddress)
logger.info(`Job count: ${jobCount}`)

// const events = await scheduledTransfers.queryFilter(scheduledTransfers.filters.ExecutionAdded())
// for (const event of events) {
// 	if (event.args.smartAccount === kernelAddress) {
// 		logger.info(`Job ID: ${event.args.jobId}`)
// 	}
// }

const log = await scheduledTransfers.executionLog(kernelAddress, jobId)

logger.info(
	`ExecutionConfig: {
		executeInterval: ${log.executeInterval},
		numberOfExecutions: ${log.numberOfExecutions},
		numberOfExecutionsCompleted: ${log.numberOfExecutionsCompleted},
		startDate: ${log.startDate},
		isEnabled: ${log.isEnabled},
		lastExecutionTime: ${log.lastExecutionTime},
		executionData: ${log.executionData}
	}`,
)
