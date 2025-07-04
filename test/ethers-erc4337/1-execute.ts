import { ADDRESS } from '@/addresses'
import { KernelAccountAPI, KernelValidationType, PublicPaymaster, type SignerBehavior } from '@/index'
import { INTERFACES } from '@/interfaces'
import { SimpleSmartSessionValidation } from '@/validations/SimpleSmartSessionValidation'
import { JsonRpcProvider, Wallet } from 'ethers'
import { ERC4337Bundler } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'
import { executeUserOperation } from './helpers'

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

// cast send --account dev --rpc-url $baseSepolia <account> --value 0.001ether
// bun run test/ethers-erc4337/1-execute.ts

const CHAIN_ID = 84532
const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, process.env.PIMLICO_API_KEY)
const acc1 = new Wallet(process.env.acc1pk)
const signer: SignerBehavior = {
	signHash: async hash => {
		return acc1.signMessage(hash)
	},
}
const client = new JsonRpcProvider(alchemyUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)

const JOB_ID = 1n
const PERMISSION_ID = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'
const ACCOUNT_ADDRESS = '0x52a64A1873c14D52007Ec0A146eAa9Ff3B84B865'

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
	paymasterAPI: PublicPaymaster,
})
