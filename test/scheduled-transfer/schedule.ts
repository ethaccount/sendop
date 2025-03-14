import ADDRESS from '@/addresses'
import type { SessionStruct } from '@/contract-types/SmartSession'
import {
	abiEncode,
	ECDSAValidatorModule,
	ERC7579_MODULE_TYPE,
	getEncodedFunctionParams,
	KernelV3Account,
	padLeft,
	PimlicoBundler,
	randomBytes32,
	Registry__factory,
	sendop,
	SMART_SESSIONS_ENABLE_MODE,
	SmartSession__factory,
} from '@/index'
import INTERFACES from '@/interfaces'
import { concat, JsonRpcProvider, parseEther, toBeHex, Wallet, ZeroAddress } from 'ethers'
import { MyPaymaster, setup } from '../../test/utils'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey, account1 } = await setup({ chainId: 'local' })

logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	// debugHandleOps: true,
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

const creationOptions = {
	salt: randomBytes32(),
	validatorAddress: ADDRESS.ECDSAValidator,
	validatorInitData: await signer.getAddress(),
}

logger.info(`Salt: ${creationOptions.salt}`)

const computedAddress = await KernelV3Account.getNewAddress(client, creationOptions)

const session: SessionStruct = {
	sessionValidator: ADDRESS.OwnableValidator,
	sessionValidatorInitData: abiEncode(['uint256', 'address[]'], [1, [account1.address]]), // threshold, signers
	salt: randomBytes32(),
	userOpPolicies: [],
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

const sessions: SessionStruct[] = [session]
const encodedSessions = getEncodedFunctionParams(
	SmartSession__factory.createInterface().encodeFunctionData('enableSessions', [sessions]),
)

const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

// install scheduled transfers module

const executeInterval = 10
const numOfExecutions = 3
const startDate = Math.floor(Date.now() / 1000) + 25 * 60 // 25 minutes from now
const recipient = account1.address
const token = ZeroAddress
const amount = toBeHex(parseEther('0.001'))

// initData: executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
const scheduledTransfersInitData = concat([
	padLeft(toBeHex(executeInterval), 6),
	padLeft(toBeHex(numOfExecutions), 2),
	padLeft(toBeHex(startDate), 6),
	abiEncode(['address', 'address', 'uint256'], [recipient, token, amount]),
])

const kernel = new KernelV3Account(computedAddress, {
	client,
	bundler,
	erc7579Validator: new ECDSAValidatorModule({
		address: ADDRESS.ECDSAValidator,
		client,
		signer,
	}),
})

const RHINESTONE_ATTESTER_ADDRESS = '0x000000333034E9f539ce08819E12c1b8Cb29084d'

const op = await sendop({
	bundler,
	executions: [
		// trust attester
		{
			to: ADDRESS.Registry,
			value: '0x0',
			data: Registry__factory.createInterface().encodeFunctionData('trustAttesters', [
				1,
				[RHINESTONE_ATTESTER_ADDRESS],
			]),
		},
		// install smart session module and enable the session
		{
			to: computedAddress,
			value: '0x0',
			data: KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
				moduleAddress: ADDRESS.SmartSession,
				validatorData: smartSessionInitData,
			}),
		},
		// install scheduled transfers module
		{
			to: computedAddress,
			value: '0x0',
			data: KernelV3Account.encodeInstallModule({
				moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
				moduleAddress: ADDRESS.ScheduledTransfers,
				executorData: scheduledTransfersInitData,
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
