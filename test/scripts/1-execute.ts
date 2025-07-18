import { ADDRESS } from '@/addresses'
import { ERC4337Bundler } from '@/core'
import { fetchGasPricePimlico, KernelAccountAPI, KernelValidationType, PublicPaymaster } from '@/index'
import { INTERFACES } from '@/interfaces'
import { SimpleSmartSessionValidation } from '@/validations/SimpleSmartSessionValidation'
import { JsonRpcProvider, Wallet } from 'ethers'
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

// cast send --account dev --rpc-url $baseSepolia <account> --value 0.001ether
// bun run test/ethers-erc4337/1-execute.ts

const CHAIN_ID = 84532
const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, process.env.PIMLICO_API_KEY)
const acc1 = new Wallet(process.env.acc1pk)
const signer = acc1
const client = new JsonRpcProvider(alchemyUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)

const JOB_ID = 1n
const PERMISSION_ID = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'
const ACCOUNT_ADDRESS = '0x960CBf515F3DcD46f541db66C76Cf7acA5BEf4C7'

const smartSessionValidation = new SimpleSmartSessionValidation({
	permissionId: PERMISSION_ID,
	threshold: 1,
})

const executions = [
	{
		to: ADDRESS.ScheduledTransfers,
		value: 0n,
		data: INTERFACES.ScheduledTransfers.encodeFunctionData('executeOrder', [JOB_ID]),
	},
]

await executeUserOperation({
	accountAPI: new KernelAccountAPI({
		validation: smartSessionValidation,
		validatorAddress: smartSessionValidation.validatorAddress,
		config: {
			nonceConfig: {
				type: KernelValidationType.VALIDATOR, // must set to use non-root validator
			},
		},
	}),
	accountAddress: ACCOUNT_ADDRESS,
	chainId: CHAIN_ID,
	client,
	bundler,
	executions,
	signer,
	gasPrice: await fetchGasPricePimlico(pimlicoUrl),
	paymasterAPI: PublicPaymaster,
})
