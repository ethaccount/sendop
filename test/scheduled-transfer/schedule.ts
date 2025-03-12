import ADDRESS from '@/addresses'
import type { SessionStruct } from '@/contract-types/SmartSession'
import {
	ECDSAValidatorModule,
	getEncodedFunctionParams,
	IERC7579Account__factory,
	KernelV3Account,
	PimlicoBundler,
	randomBytes32,
	ScheduledTransfers__factory,
	sendop,
	SMART_SESSIONS_ENABLE_MODE,
	SmartSession__factory,
} from '@/index'
import { concat, Interface, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { MyPaymaster, setup } from '../../test/utils'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey, account0, account1 } = await setup({ chainId: 'local' })

logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	// debugHandleOps: true,
})

const pmGetter = new MyPaymaster({
	client,
	paymasterAddress: ADDRESS.CharityPaymaster,
})

const creationOptions = {
	salt: randomBytes32(),
	validatorAddress: ADDRESS.ECDSAValidator,
	initData: await signer.getAddress(),
}

logger.info(`Salt: ${creationOptions.salt}`)

const computedAddress = await KernelV3Account.getNewAddress(client, creationOptions)

const session: SessionStruct = {
	sessionValidator: ADDRESS.K1Validator,
	sessionValidatorInitData: account1.address, // session key owner
	salt: randomBytes32(),
	userOpPolicies: [],
	erc7739Policies: {
		erc1271Policies: [],
		allowedERC7739Content: [],
	},
	actions: [
		{
			actionTargetSelector: ScheduledTransfers__factory.createInterface().getFunction('executeOrder').selector,
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
const enableSessionEncodedParams = getEncodedFunctionParams(
	SmartSession__factory.createInterface().encodeFunctionData('enableSessions', [sessions]),
)

const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, enableSessionEncodedParams])

const kernel = new KernelV3Account(computedAddress, {
	client,
	bundler,
	erc7579Validator: new ECDSAValidatorModule({
		address: ADDRESS.ECDSAValidator,
		client,
		signer,
	}),
})

const op = await sendop({
	bundler,
	executions: [
		{
			to: computedAddress,
			value: '0x0',
			data: IERC7579Account__factory.createInterface().encodeFunctionData('installModule', [
				1,
				ADDRESS.SmartSession,
				KernelV3Account.getInstallModuleInitData(ZeroAddress, smartSessionInitData, '0x', '0x00000000'),
			]),
		},
		// Set a random number on the counter contract
		{
			to: ADDRESS.Counter,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
				Math.floor(Math.random() * 1000000),
			]),
			value: '0x0',
		},
	],
	opGetter: kernel,
	initCode: kernel.getInitCode(creationOptions),
	pmGetter,
})

logger.info(`hash: ${op.hash}`)

const receipt = await op.wait()
logger.info('deployed address:', computedAddress)
logger.info('userOp success:', receipt.success)
