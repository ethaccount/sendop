import { Simple7702UserOpBuilder } from '@/accounts/simple7702/builder'
import { ADDRESS } from '@/addresses'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { getUSDCPaymaster } from '@/paymasters/usdc-paymaster'
import { JsonRpcProvider, parseUnits, Wallet } from 'ethers'
import { ERC4337Bundler, type TypedData } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', dev7702 = '', dev7702pk = '' } = process.env

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

const wallet = new Wallet(dev7702pk)

const usdcPaymaster = await getUSDCPaymaster({
	client,
	chainId: CHAIN_ID,
	accountAddress: dev7702,
	permitAmount: parseUnits('2', 6),
	minAllowanceThreshold: parseUnits('2', 6),
	signTypedData: async (typedData: TypedData) => {
		return wallet.signTypedData(...typedData)
	},
})

const userop = await new Simple7702UserOpBuilder({
	chainId: CHAIN_ID,
	bundler,
	client,
	accountAddress: dev7702,
}).buildExecutions([
	{
		to: ADDRESS.Counter,
		value: 0n,
		data: INTERFACES.Counter.encodeFunctionData('increment'),
	},
])

userop.setPaymaster(usdcPaymaster).setGasPrice(await fetchGasPricePimlico(bundlerUrl))

await userop.estimateGas()

await userop.signUserOpTypedData(typedData => wallet.signTypedData(...typedData))

const hash = await userop.send()
console.log('sent', hash)

const receipt = await userop.wait()
console.log('success', receipt.success)
