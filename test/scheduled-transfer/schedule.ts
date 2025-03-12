import ADDRESS from '@/addresses'
import type { SessionStruct } from '@/contract-types/SmartSession'
import {
	ECDSAValidatorModule,
	IERC7579Account__factory,
	KernelV3Account,
	PimlicoBundler,
	sendop,
	SMART_SESSIONS_ENABLE_MODE,
	SmartSession__factory,
} from '@/index'
import { concat, hexlify, Interface, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { MyPaymaster, setup } from '../../test/utils'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey, account1 } = await setup({ chainId: 'local' })

logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	async onBeforeSendUserOp(userOp) {
		console.log(userOp)
		return userOp
	},
})
const pmGetter = new MyPaymaster({
	client,
	paymasterAddress: ADDRESS.CharityPaymaster,
})

const creationOptions = {
	salt: hexlify(randomBytes(32)), // random salt
	validatorAddress: ADDRESS.ECDSAValidator,
	initData: await signer.getAddress(),
}

logger.info(`Salt: ${creationOptions.salt}`)

const computedAddress = await KernelV3Account.getNewAddress(client, creationOptions)

const session: SessionStruct = {
	sessionValidator: ADDRESS.K1Validator,
	sessionValidatorInitData: account1.address,
	salt: hexlify(randomBytes(32)), // random salt
	userOpPolicies: [],
	erc7739Policies: {
		erc1271Policies: [],
		allowedERC7739Content: [],
	},
	actions: [
		{
			actionTargetSelector: new Interface(['function executeOrder(uint256 jobId)']).getFunction('executeOrder')!
				.selector,
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
const enableSessionCallData = SmartSession__factory.createInterface().encodeFunctionData('enableSessions', [sessions])

const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, enableSessionCallData])

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
			value: '0',
			data: IERC7579Account__factory.createInterface().encodeFunctionData('installModule', [
				1,
				ADDRESS.SmartSession,
				smartSessionInitData,
			]),
		},
	],
	opGetter: kernel,
	initCode: kernel.getInitCode(creationOptions),
	pmGetter,
})

logger.info(`hash: ${op.hash}`)

await op.wait()
logger.info('address:', computedAddress)
