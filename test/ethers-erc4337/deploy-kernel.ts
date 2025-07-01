import { KernelUserOpBuilder } from '@/accounts/kernel/builder'
import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { fetchGasPriceAlchemy } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { ECDSAValidator, getECDSAValidator } from '@/modules/ECDSAValidator'
import { toBytes32 } from '@/utils'
import { JsonRpcProvider, Wallet } from 'ethers'
import { ERC4337Bundler } from 'ethers-erc4337'
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
const ECDSA_VALIDATOR_ADDRESS = '0x8104e3ad430ea6d354d013a6789fdfc71e671c43'
const PUBLIC_PAYMASTER_ADDRESS = '0xcD1c62f36A99f306948dB76c35Bbc1A639f92ce8'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)

const wallet = new Wallet(dev7702pk)

const { accountAddress, factory, factoryData } = await KernelUserOpBuilder.computeAddress(
	client,
	ECDSA_VALIDATOR_ADDRESS,
	dev7702,
	toBytes32(4n),
)

console.log('accountAddress', accountAddress)

const userop = await new KernelUserOpBuilder({
	chainId: CHAIN_ID,
	bundler,
	client,
	accountAddress,
	validator: new ECDSAValidator(getECDSAValidator({ ownerAddress: dev7702 })),
}).buildExecution([
	{
		to: ADDRESS.Counter,
		value: 0n,
		data: INTERFACES.Counter.encodeFunctionData('increment'),
	},
])

userop
	.setFactory({ factory, factoryData })
	.setPaymaster({
		paymaster: PUBLIC_PAYMASTER_ADDRESS,
	})
	.setGasPrice(await fetchGasPriceAlchemy(rpcUrl))
	.setSignature(DUMMY_ECDSA_SIGNATURE)

await userop.estimateGas()
await userop.signUserOpHash(userOpHash => wallet.signMessage(userOpHash))

const hash = await userop.send()
console.log('sent', hash)

const receipt = await userop.wait()
console.log('success', receipt.success)
