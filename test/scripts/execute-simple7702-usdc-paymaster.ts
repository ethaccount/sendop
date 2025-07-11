import { Simple7702AccountAPI } from '@/accounts/simple7702'
import { ADDRESS } from '@/addresses'
import { ERC4337Bundler, type TypedData } from '@/core'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { createUSDCPaymaster } from '@/paymasters/usdc-paymaster'
import { JsonRpcProvider, parseUnits, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import { executeUserOperation } from '../helpers'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}

const CHAIN_ID = 11155111

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)

const signer = new Wallet(DEV_7702_PK)

const usdcPaymaster = await createUSDCPaymaster({
	client,
	chainId: CHAIN_ID,
	accountAddress: signer.address,
	permitAmount: parseUnits('10', 6),
	minAllowanceThreshold: parseUnits('10', 6),
	signTypedData: async (typedData: TypedData) => {
		return signer.signTypedData(...typedData)
	},
})

await executeUserOperation({
	accountAPI: new Simple7702AccountAPI(),
	accountAddress: signer.address,
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
	gasPrice: await fetchGasPricePimlico(bundlerUrl),
	paymasterAPI: usdcPaymaster,
})
