import { ADDRESS } from '@/addresses'
import { RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import type { SessionStruct } from '@/contract-types/TSmartSession'
import {
	ECDSAValidator,
	ERC7579_MODULE_TYPE,
	getECDSAValidator,
	getEncodedFunctionParams,
	getPermissionId,
	Kernel,
	KernelUserOpBuilder,
	randomBytes32,
	SMART_SESSIONS_ENABLE_MODE,
	toBytes32,
	TRegistry__factory,
	TSmartSession__factory,
} from '@/index'
import { INTERFACES } from '@/interfaces'
import { getScheduledTransferInitData } from '@/modules/scheduledTransfer'
import { publicPaymaster } from '@/paymasters/public-paymaster'
import { getOwnableValidator } from '@rhinestone/module-sdk'
import { concat, JsonRpcProvider, parseEther, Wallet, ZeroAddress } from 'ethers'
import { ERC4337Bundler } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'
import { executeUserOp } from 'test/test-utils'

if (!process.env.ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

if (!process.env.PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}

if (!process.env.dev7702pk) {
	throw new Error('dev7702pk is not set')
}

if (!process.env.acc1pk) {
	throw new Error('acc1pk is not set')
}

// bun run test/scheduled-transfer/new/0-schedule.ts

const CHAIN_ID = 84532
const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, process.env.PIMLICO_API_KEY)
const owner = new Wallet(process.env.dev7702pk)
const client = new JsonRpcProvider(alchemyUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)

const ecdsaValidator = getECDSAValidator({ ownerAddress: owner.address })

const { factory, factoryData, accountAddress } = await Kernel.getDeployment({
	client,
	validatorAddress: ecdsaValidator.address,
	validatorData: ecdsaValidator.initData,
	salt: randomBytes32(),
})

console.log('accountAddress', accountAddress)

const sessionSigner = new Wallet(process.env.acc1pk)

const ownableValidator = getOwnableValidator({
	threshold: 1,
	owners: [sessionSigner.address as `0x${string}`],
})

const session: SessionStruct = {
	sessionValidator: ownableValidator.address,
	sessionValidatorInitData: ownableValidator.initData,
	salt: toBytes32(1n),
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
console.log(`Permission ID: ${permissionId}`)

const sessions: SessionStruct[] = [session]
const encodedSessions = getEncodedFunctionParams(
	TSmartSession__factory.createInterface().encodeFunctionData('enableSessions', [sessions]),
)

const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

const userop = await new KernelUserOpBuilder({
	chainId: CHAIN_ID,
	bundler,
	client,
	accountAddress,
	validator: new ECDSAValidator(ecdsaValidator),
}).buildExecutions([
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
		to: accountAddress,
		value: 0n,
		data: Kernel.encodeInstallModule({
			moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
			moduleAddress: ADDRESS.SmartSession,
			initData: smartSessionInitData,
			selectorData: INTERFACES.KernelV3.getFunction('execute').selector,
		}),
	},
	// install scheduled transfers module
	{
		to: accountAddress,
		value: 0n,
		data: Kernel.encodeInstallModule({
			moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
			moduleAddress: ADDRESS.ScheduledTransfers,
			initData: getScheduledTransferInitData({
				executeInterval: 10,
				numOfExecutions: 3,
				startDate: Math.floor(Date.now() / 1000),
				recipient: sessionSigner.address,
				token: ZeroAddress,
				amount: parseEther('0.001'),
			}),
		}),
	},
])

userop
	.setFactory({
		factory,
		factoryData,
	})
	.setPaymaster(publicPaymaster)

await executeUserOp(userop, pimlicoUrl, owner)
