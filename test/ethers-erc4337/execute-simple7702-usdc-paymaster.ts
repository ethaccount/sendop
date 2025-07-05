import { Simple7702AccountAPI } from '@/accounts/simple7702'
import { ADDRESS } from '@/addresses'
import { INTERFACES } from '@/interfaces'
import { createUSDCPaymaster } from '@/paymasters/usdc-paymaster'
import type { SignerBehavior } from '@/types'
import { JsonRpcProvider, parseUnits, Wallet } from 'ethers'
import { ERC4337Bundler, type TypedData } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'
import { executeUserOperation } from './helpers'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', dev7702 = '', DEV_7702_PK = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}
if (!dev7702) {
	throw new Error('dev7702 is not set')
}

const CHAIN_ID = 11155111

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)

const wallet = new Wallet(DEV_7702_PK)

const usdcPaymaster = await createUSDCPaymaster({
	client,
	chainId: CHAIN_ID,
	accountAddress: dev7702,
	permitAmount: parseUnits('10', 6),
	minAllowanceThreshold: parseUnits('10', 6),
	signTypedData: async (typedData: TypedData) => {
		return wallet.signTypedData(...typedData)
	},
})

const signer: SignerBehavior = {
	signHash: async (hash: Uint8Array) => {
		return wallet.signingKey.sign(hash).serialized
	},
}

await executeUserOperation({
	accountAPI: new Simple7702AccountAPI(),
	accountAddress: dev7702,
	chainId: CHAIN_ID,
	client,
	bundler,
	executions: [
		{
			to: ADDRESS.Counter,
			value: 0n,
			data: INTERFACES.Counter.encodeFunctionData('increment'),
		},
	],
	signer,
	paymasterAPI: usdcPaymaster,
})
