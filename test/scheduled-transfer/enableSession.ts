import { ADDRESS } from '@/addresses'
import type { SessionStruct } from '@/contract-types/SmartSession'
import {
	abiEncode,
	EOAValidatorModule,
	getPermissionId,
	KernelV3Account,
	PimlicoBundler,
	sendop,
	zeroPadLeft,
} from '@/index'
import { INTERFACES } from '@/interfaces'
import { JsonRpcProvider, toBeHex, Wallet } from 'ethers'
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
	// address
	.option('address', {
		alias: 'a',
		type: 'string',
		description: 'Address',
		demandOption: true,
	})
	.help().argv
const network = argv.network === 'sepolia' ? '11155111' : 'local'
const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey, account1 } = await setup({ chainId: network })
logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	parseError: true,
	// debugSend: true,
	// async onBeforeSendUserOp(userOp) {
	// 	logger.info('userOp', userOp)
	// 	logger.info('callData', userOp.callData)
	// 	return userOp
	// },
})

const pmGetter = new MyPaymaster({
	client,
	paymasterAddress: ADDRESS.CharityPaymaster,
})

const session: SessionStruct = {
	sessionValidator: ADDRESS.OwnableValidator,
	sessionValidatorInitData: abiEncode(['uint256', 'address[]'], [1, [account1.address]]), // threshold, signers
	salt: zeroPadLeft(toBeHex(1), 32),
	userOpPolicies: [
		{
			policy: ADDRESS.SudoPolicy,
			initData: '0x',
		},
	],
	erc7739Policies: {
		erc1271Policies: [],
		allowedERC7739Content: [],
	},
	actions: [
		{
			actionTargetSelector: INTERFACES.ScheduledTransfers.getFunction('executeOrder').selector,
			actionTarget: ADDRESS.ScheduledTransfers,
			actionPolicies: [
				{
					policy: ADDRESS.SudoPolicy,
					initData: '0x',
				},
			],
		},
	],
	permitERC4337Paymaster: true,
}
const permissionId = getPermissionId(session)
logger.info(`Permission ID: ${permissionId}`)
const sessions: SessionStruct[] = [session]

const op = await sendop({
	bundler,
	executions: [
		// install smart session module and enable the session
		{
			to: ADDRESS.SmartSession,
			value: 0n,
			data: INTERFACES.SmartSession.encodeFunctionData('enableSessions', [sessions]),
		},
	],
	opGetter: new KernelV3Account({
		address: argv.address,
		client,
		bundler,
		validator: new EOAValidatorModule({
			address: ADDRESS.K1Validator,
			signer,
		}),
	}),
	pmGetter,
})

logger.info(`hash: ${op.hash}`)

const receipt = await op.wait()
logger.info('userOp success:', receipt.success)
