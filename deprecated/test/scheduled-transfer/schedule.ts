import { ADDRESS } from '@/addresses'
import { RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import type { SessionStruct } from '@/contract-types/TSmartSession'
import {
	abiEncode,
	EOAValidator,
	ERC7579_MODULE_TYPE,
	getEncodedFunctionParams,
	getPermissionId,
	KernelV3Account,
	zeroPadLeft,
	PimlicoBundler,
	randomBytes32,
	TRegistry__factory,
	sendop,
	SMART_SESSIONS_ENABLE_MODE,
	TSmartSession__factory,
} from '@/index'
import { INTERFACES } from '@/interfaces'
import { concat, JsonRpcProvider, parseEther, toBeHex, Wallet, ZeroAddress } from 'ethers'
import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { setup } from '../../test/utils'
import { DeprecatedPublicPaymaster } from '@/paymasters'

const argv = await yargs(hideBin(process.argv))
	.option('network', {
		alias: 'n',
		choices: ['local', 'sepolia'] as const,
		description: 'Network (local or sepolia)',
		demandOption: true,
	})
	.option('bundler', {
		alias: 'b',
		choices: ['alchemy', 'pimlico'] as const,
		description: 'Bundler (alchemy or pimlico)',
		demandOption: false,
		default: 'pimlico',
	})
	.help().argv

const CHAIN_IDS = {
	local: 1337n,
	sepolia: 11155111n,
} as const
const chainId = CHAIN_IDS[argv.network]
const { logger, CLIENT_URL, BUNDLER_URL, privateKey, account1 } = await setup({ chainId })

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

const pmGetter = new DeprecatedPublicPaymaster(ADDRESS.PublicPaymaster)

const creationOptions = {
	salt: randomBytes32(),
	validatorAddress: ADDRESS.ECDSAValidator,
	validatorInitData: await signer.getAddress(),
}

logger.info(`Salt: ${creationOptions.salt}`)

const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)

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
const encodedSessions = getEncodedFunctionParams(
	TSmartSession__factory.createInterface().encodeFunctionData('enableSessions', [sessions]),
)

const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

// install scheduled transfers module

const executeInterval = 10
const numOfExecutions = 3
const startDate =
	chainId === 1337n
		? 1 // Use a smaller fixed timestamp for local testing
		: Math.floor(Date.now() / 1000)
const recipient = account1.address
const token = ZeroAddress
const amount = toBeHex(parseEther('0.001'))

// initData: executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
const scheduledTransfersInitData = concat([
	zeroPadLeft(toBeHex(executeInterval), 6),
	zeroPadLeft(toBeHex(numOfExecutions), 2),
	zeroPadLeft(toBeHex(startDate), 6),
	abiEncode(['address', 'address', 'uint256'], [recipient, token, amount]),
])

const kernel = new KernelV3Account({
	address: computedAddress,
	client,
	bundler,
	validator: new EOAValidator({
		address: ADDRESS.ECDSAValidator,
		signer,
	}),
})

const op = await sendop({
	bundler,
	executions: [
		// trust attester
		{
			to: ADDRESS.Registry,
			value: 0n,
			data: TRegistry__factory.createInterface().encodeFunctionData('trustAttesters', [
				1,
				[RHINESTONE_ATTESTER_ADDRESS],
			]),
		},
		// install smart session module and enable the session
		{
			to: computedAddress,
			value: 0n,
			data: KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
				moduleAddress: ADDRESS.SmartSession,
				initData: smartSessionInitData,
				selectorData: INTERFACES.KernelV3.getFunction('execute').selector,
			}),
		},
		// install scheduled transfers module
		{
			to: computedAddress,
			value: 0n,
			data: KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledTransfers,
				initData: scheduledTransfersInitData,
			}),
		},
	],
	opGetter: kernel,
	initCode: kernel.getInitCode(creationOptions), // create account
	pmGetter,
})

logger.info(`hash: ${op.hash}`)

const receipt = await op.wait()
logger.info('deployed address:', computedAddress)
logger.info('userOp success:', receipt.success)

fs.writeFileSync(path.join(__dirname, 'deployed-address.txt'), computedAddress)
