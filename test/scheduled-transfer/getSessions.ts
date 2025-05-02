import { ADDRESS } from '@/addresses'
import { TSmartSession__factory } from '@/contract-types'
import { INTERFACES } from '@/interfaces'
import { concat, JsonRpcProvider, keccak256 } from 'ethers'
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
	// address
	.option('address', {
		alias: 'a',
		type: 'string',
		description: 'Address',
		demandOption: true,
	})
	.help().argv

const CHAIN_IDS = {
	local: 1337n,
	sepolia: 11155111n,
} as const

const chainId = CHAIN_IDS[argv.network]
const { logger, CLIENT_URL } = await setup({ chainId })
logger.info(`Chain ID: ${chainId}`)

const client = new JsonRpcProvider(CLIENT_URL, undefined, {
	batchMaxCount: 1,
})
const smartsession = TSmartSession__factory.connect(ADDRESS.SmartSession, client)

const actionTargetSelector = INTERFACES.ScheduledTransfers.getFunction('executeOrder').selector
const actionTarget = ADDRESS.ScheduledTransfers
logger.info('actionTargetSelector', actionTargetSelector)
logger.info('actionTarget', actionTarget)

const actionId = keccak256(concat([actionTarget, actionTargetSelector]))
logger.info('actionId', actionId)

logger.info('---------------- Sessions ----------------')
const sessionCreatedEvents = await smartsession.queryFilter(smartsession.filters.SessionCreated())
for (const event of sessionCreatedEvents) {
	if (event.args.account === argv.address) {
		const permissionId = event.args.permissionId
		logger.info('permissionId', permissionId)

		const isPermissionEnabled = await smartsession.isPermissionEnabled(permissionId, argv.address)
		logger.info('isPermissionEnabled', isPermissionEnabled)

		const [sessionValidator, sessionValidatorData] = await smartsession.getSessionValidatorAndConfig(
			argv.address,
			permissionId,
		)
		logger.info('sessionValidator', sessionValidator)
		logger.info('sessionValidatorData', sessionValidatorData)

		const enabledActions = await smartsession.getEnabledActions(argv.address, permissionId)
		for (const actionId of enabledActions) {
			logger.info('actionId', actionId)

			const isActionIdEnabled = await smartsession.isActionIdEnabled(
				argv.address,
				event.args.permissionId,
				actionId,
			)
			logger.info('isActionIdEnabled', isActionIdEnabled)
			const actionPolicies = await smartsession.getActionPolicies(argv.address, permissionId, actionId)
			logger.info('actionPolicies', actionPolicies)

			const areActionsEnabled = await smartsession.areActionsEnabled(argv.address, permissionId, [
				{
					actionTargetSelector: actionTargetSelector,
					actionTarget: actionTarget,
					actionPolicies: [
						{
							policy: actionPolicies[0],
							initData: '0x', // this does not affect
						},
					],
				},
			])
			logger.info('areActionsEnabled', areActionsEnabled)
			logger.info('--------------------------------')
		}
	}
}
