import { ADDRESS } from '@/addresses'
import { KernelUserOpBuilder, KernelValidationType } from '@/index'
import { INTERFACES } from '@/interfaces'
import { SmartSessionValidation } from '@/modules/SmartSessionValidation'
import { JsonRpcProvider, Wallet } from 'ethers'
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

// cast send --account dev --rpc-url $baseSepolia <account> --value 0.001ether
// bun run test/scheduled-transfer/new/1-execute.ts

const CHAIN_ID = 84532
const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, process.env.PIMLICO_API_KEY)
const acc1 = new Wallet(process.env.acc1pk)
const client = new JsonRpcProvider(alchemyUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)

const JOB_ID = 1n
const PERMISSION_ID = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'
const ACCOUNT_ADDRESS = '0xE9697c6927d517304E1B4560832F87f07c4058ef'

const userop = await new KernelUserOpBuilder({
	chainId: CHAIN_ID,
	bundler,
	client,
	accountAddress: ACCOUNT_ADDRESS,
	validator: new SmartSessionValidation({
		permissionId: PERMISSION_ID,
		threshold: 1,
	}),
	nonceConfig: {
		type: KernelValidationType.VALIDATOR,
	},
}).buildExecutions([
	{
		to: ADDRESS.ScheduledTransfers,
		value: 0n,
		data: INTERFACES.ScheduledTransfers.encodeFunctionData('executeOrder', [JOB_ID]),
	},
])

console.log(userop.hex())

await executeUserOp(userop, pimlicoUrl, acc1)
