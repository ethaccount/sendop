import { ScheduledTransfers__factory } from '@/contract-types'
import { setup } from '../utils'
import { JsonRpcProvider } from 'ethers'
import ADDRESS from '@/addresses'

const kernelAddress = '0x1e1657CE5DDB70654707355f2c6fDA43Daf066De'

const { logger, chainId, CLIENT_URL } = await setup({ chainId: 'local' })

logger.info(`Chain ID: ${chainId}`)
logger.info(`Kernel address: ${kernelAddress}`)

const client = new JsonRpcProvider(CLIENT_URL)
const scheduledTransfers = ScheduledTransfers__factory.connect(ADDRESS.ScheduledTransfers, client)

const jobCount = await scheduledTransfers.accountJobCount(kernelAddress)
logger.info(`Job count: ${jobCount}`)

const events = await scheduledTransfers.queryFilter(scheduledTransfers.filters.ExecutionAdded())
for (const event of events) {
	if (event.args.smartAccount === kernelAddress) {
		logger.info(`Job ID: ${event.args.jobId}`)
	}
}
