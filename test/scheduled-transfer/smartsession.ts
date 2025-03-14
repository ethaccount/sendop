import { SmartSession__factory } from '@/contract-types'
import { setup } from '../utils'
import { JsonRpcProvider } from 'ethers'
import ADDRESS from '@/addresses'

const kernelAddress = '0x1e1657CE5DDB70654707355f2c6fDA43Daf066De'
const permissionId = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'

const { logger, chainId, CLIENT_URL } = await setup({ chainId: 'local' })

logger.info(`Chain ID: ${chainId}`)
logger.info(`Kernel address: ${kernelAddress}`)

const client = new JsonRpcProvider(CLIENT_URL)
const smartsession = SmartSession__factory.connect(ADDRESS.SmartSession, client)

const enabledActions = await smartsession.getEnabledActions(kernelAddress, permissionId)
logger.info('enabledActions', enabledActions)

const sessionValidatorAndConfig = await smartsession.getSessionValidatorAndConfig(kernelAddress, permissionId)
logger.info('sessionValidatorAndConfig', sessionValidatorAndConfig)

const sessionCreatedEvents = await smartsession.queryFilter(smartsession.filters.SessionCreated())
for (const event of sessionCreatedEvents) {
	if (event.args.account === kernelAddress) {
		logger.info('Session created, permissionId:', event.args.permissionId)
	}
}
