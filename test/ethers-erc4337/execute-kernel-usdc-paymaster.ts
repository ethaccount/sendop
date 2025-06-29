import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { getUSDCPaymaster } from '@/paymasters/usdc-paymaster'
import { toBytes32 } from '@/utils'
import { concat, hexlify, JsonRpcProvider, Wallet } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, ERC4337Bundler, UserOpBuilder, type TypedData } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'
import { encodeKernelExecutionData, getKernelAddress, getKernelNonce } from './kernel'

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

const CHAIN_ID = 84532 // base sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const USDC_PAYMASTER_ADDRESS = '0x31BE08D380A21fc740883c0BC434FcFc88740b58'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)

const entryPointAddress = ENTRY_POINT_V07_ADDRESS

const wallet = new Wallet(dev7702pk)

const { accountAddress, factory, factoryData } = await getKernelAddress(
	client,
	ADDRESS.ECDSAValidator,
	dev7702,
	toBytes32(2n),
)

console.log('accountAddress', accountAddress)

const nonce = await getKernelNonce(client, accountAddress, ADDRESS.ECDSAValidator)

const usdcPaymaster = await getUSDCPaymaster({
	client,
	chainId: CHAIN_ID,
	accountAddress,
	paymasterAddress: USDC_PAYMASTER_ADDRESS,
	usdcAddress: USDC_ADDRESS,
	getERC1271Signature: async (permitHash: Uint8Array) => {
		const typedData: TypedData = [
			{
				name: 'Kernel',
				version: '0.3.3',
				chainId: CHAIN_ID,
				verifyingContract: accountAddress,
			},
			{
				Kernel: [{ name: 'hash', type: 'bytes32' }],
			},
			{
				hash: hexlify(permitHash),
			},
		]

		const sig = await wallet.signTypedData(...typedData)

		return concat([
			'0x01', // validator mode
			ADDRESS.ECDSAValidator,
			sig,
		])
	},
})

const userop = new UserOpBuilder(bundler, entryPointAddress, CHAIN_ID)
	.setSender(accountAddress)
	.setNonce(nonce)
	.setGasPrice(await fetchGasPricePimlico(bundlerUrl))
	.setSignature(DUMMY_ECDSA_SIGNATURE)
	.setCallData(
		await encodeKernelExecutionData([
			{
				to: ADDRESS.Counter,
				value: 0n,
				data: INTERFACES.Counter.encodeFunctionData('increment'),
			},
		]),
	)
	.setPaymaster(usdcPaymaster)

await userop.estimateGas()
await userop.signUserOpHash(userOpHash => wallet.signMessage(userOpHash))

const hash = await userop.send()
console.log('sent', hash)

const receipt = await userop.wait()
console.log('success', receipt.success)
