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
	randomBytes32,
	sendop,
	SMART_SESSIONS_ENABLE_MODE,
	TRegistry__factory,
	TSmartSession__factory,
	zeroPadLeft,
} from '@/index'
import { INTERFACES } from '@/interfaces'
import { DeprecatedPublicPaymaster } from '@/paymasters'
import { concat, parseUnits, toBeHex } from 'ethers'
import fs from 'fs'
import path from 'path'
import { logger, setupCLI } from '../utils'
import { USDC, USDC_DECIMALS, WETH } from './utils'

/*
bun run test/scheduled-swap/schedule-swap.ts -r $sepolia -p $devpk
*/

const sessionSignerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

const { client, bundler, signer } = await setupCLI(['r', 'b', 'p'], {
	bundlerOptions: {
		parseError: true,
	},
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
	sessionValidatorInitData: abiEncode(['uint256', 'address[]'], [1, [sessionSignerAddress]]), // threshold, signers
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
			actionTargetSelector: INTERFACES.ScheduledOrders.getFunction('executeOrder').selector,
			actionTarget: ADDRESS.ScheduledOrders,
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

// install scheduled swaps module

const SWAP_ROUTER = '0x65669fE35312947050C450Bd5d36e6361F85eC12'

const executeInterval = 10 // seconds
const numOfExecutions = 3
const startDate = Math.floor(Date.now() / 1000)

const tokenIn = USDC
const tokenOut = WETH
const amountIn = parseUnits('1000', USDC_DECIMALS)

// initData: SWAP_ROUTER (20) ++ executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
const scheduledSwapsInitData = concat([
	SWAP_ROUTER,
	zeroPadLeft(toBeHex(executeInterval), 6),
	zeroPadLeft(toBeHex(numOfExecutions), 2),
	zeroPadLeft(toBeHex(startDate), 6),
	abiEncode(['address', 'address', 'uint256'], [tokenIn, tokenOut, amountIn]),
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
		// install scheduled swaps module
		{
			to: computedAddress,
			value: 0n,
			data: KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledOrders,
				initData: scheduledSwapsInitData,
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
