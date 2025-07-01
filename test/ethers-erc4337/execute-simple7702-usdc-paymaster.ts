import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { fetchGasPriceAlchemy } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { getUSDCPaymaster } from '@/paymasters/usdc-paymaster'
import { JsonRpcProvider, Wallet } from 'ethers'
import {
	ENTRY_POINT_V08_ADDRESS,
	EntryPointV08__factory,
	ERC4337Bundler,
	UserOpBuilder,
	type TypedData,
} from 'ethers-erc4337'
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

const entryPointAddress = ENTRY_POINT_V08_ADDRESS
const entryPoint = EntryPointV08__factory.connect(entryPointAddress, client)

const wallet = new Wallet(dev7702pk)

const usdcPaymaster = await getUSDCPaymaster({
	client,
	chainId: CHAIN_ID,
	accountAddress: dev7702,
	getSignature: async (typedData: TypedData) => {
		return wallet.signTypedData(...typedData)
	},
})

const userop = new UserOpBuilder(bundler, entryPointAddress, CHAIN_ID)
	.setSender(dev7702)
	.setNonce(await entryPoint.getNonce(dev7702, 0n))
	.setGasPrice(await fetchGasPriceAlchemy(rpcUrl))
	.setSignature(DUMMY_ECDSA_SIGNATURE)
	.setCallData(
		INTERFACES.Simple7702AccountV08.encodeFunctionData('execute', [
			ADDRESS.Counter,
			0n,
			INTERFACES.Counter.encodeFunctionData('increment'),
		]),
	)
	.setPaymaster(usdcPaymaster)

await userop.estimateGas()

await userop.signUserOpTypedData(typedData => wallet.signTypedData(...typedData))

const hash = await userop.send()
console.log('sent', hash)

const receipt = await userop.wait()
console.log('success', receipt.success)
