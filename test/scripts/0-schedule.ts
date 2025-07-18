import { ADDRESS } from '@/addresses'
import { RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import type { SessionStruct } from '@/contract-types/SmartSession'
import { ERC4337Bundler } from '@/core'
import {
	ERC7579_MODULE_TYPE,
	fetchGasPricePimlico,
	getEncodedFunctionParams,
	getPermissionId,
	KernelAccountAPI,
	KernelAPI,
	PublicPaymaster,
	randomBytes32,
	Registry__factory,
	SingleEOAValidation,
	SMART_SESSIONS_ENABLE_MODE,
	SmartSession__factory,
	toBytes32,
} from '@/index'
import { INTERFACES } from '@/interfaces'
import { getScheduledTransferInitData } from '@/utils'
import { getECDSAValidator } from '@/validations/getECDSAValidator'
import { getOwnableValidator } from '@rhinestone/module-sdk'
import { concat, JsonRpcProvider, parseEther, Wallet, ZeroAddress } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import { executeUserOperation } from '../helpers'

if (!process.env.ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

if (!process.env.PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}

if (!process.env.DEV_7702_PK) {
	throw new Error('DEV_7702_PK is not set')
}

if (!process.env.acc1pk) {
	throw new Error('acc1pk is not set')
}

// bun run test/ethers-erc4337/0-schedule.ts

const CHAIN_ID = 84532
const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, process.env.PIMLICO_API_KEY)

const client = new JsonRpcProvider(alchemyUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)

const signer = new Wallet(process.env.DEV_7702_PK)

const ecdsaValidator = getECDSAValidator({ ownerAddress: signer.address })

const { factory, factoryData, accountAddress } = await KernelAPI.getDeployment({
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
	SmartSession__factory.createInterface().encodeFunctionData('enableSessions', [sessions]),
)

const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

const executions = [
	// trust attester
	{
		to: ADDRESS.Registry,
		value: 0n,
		data: Registry__factory.createInterface().encodeFunctionData('trustAttesters', [
			1,
			[RHINESTONE_ATTESTER_ADDRESS],
		]),
	},
	// install smart session module and enable the session
	{
		to: accountAddress,
		value: 0n,
		data: KernelAPI.encodeInstallModule({
			moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
			moduleAddress: ADDRESS.SmartSession,
			initData: smartSessionInitData,
			selectorData: KernelAPI.executeSelector,
		}),
	},
	// install scheduled transfers module
	{
		to: accountAddress,
		value: 0n,
		data: KernelAPI.encodeInstallModule({
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
]

await executeUserOperation({
	accountAPI: new KernelAccountAPI({
		validation: new SingleEOAValidation(),
		validatorAddress: ecdsaValidator.address,
	}),
	accountAddress,
	chainId: CHAIN_ID,
	client,
	bundler,
	executions,
	signer,
	gasPrice: await fetchGasPricePimlico(pimlicoUrl),
	paymasterAPI: PublicPaymaster,
	deployment: {
		factory,
		factoryData,
	},
})
