import { Kernel } from '@/accounts'
import { KernelUserOpBuilder } from '@/accounts/kernel/builder'
import { ADDRESS } from '@/addresses'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { ECDSAValidator, getECDSAValidator } from '@/validations/ECDSAValidator'
import { getUSDCPaymaster } from '@/paymasters/usdc-paymaster'
import { toBytes32 } from '@/utils'
import { getBytes, JsonRpcProvider, TypedDataEncoder, Wallet } from 'ethers'
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

const CHAIN_ID = 84532 // base sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const USDC_PAYMASTER_ADDRESS = '0x31BE08D380A21fc740883c0BC434FcFc88740b58'

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)

const wallet = new Wallet(dev7702pk)

const ecdsaValidator = getECDSAValidator({ ownerAddress: dev7702 })

const { accountAddress } = await Kernel.getDeployment({
	client,
	validatorAddress: ecdsaValidator.address,
	validatorData: ecdsaValidator.initData,
	salt: toBytes32(2n),
})

console.log('accountAddress', accountAddress)

const userop = await new KernelUserOpBuilder({
	chainId: CHAIN_ID,
	bundler,
	client,
	accountAddress,
	validator: new ECDSAValidator(ecdsaValidator),
}).buildExecutions([
	{
		to: ADDRESS.Counter,
		value: 0n,
		data: INTERFACES.Counter.encodeFunctionData('increment'),
	},
])

const usdcPaymaster = await getUSDCPaymaster({
	client,
	chainId: CHAIN_ID,
	accountAddress,
	paymasterAddress: USDC_PAYMASTER_ADDRESS,
	usdcAddress: USDC_ADDRESS,
	signTypedData: async (typedData: TypedData) => {
		return await Kernel.sign1271({
			version: '0.3.3',
			validator: ADDRESS.ECDSAValidator,
			hash: getBytes(TypedDataEncoder.hash(...typedData)),
			chainId: CHAIN_ID,
			accountAddress,
			signHash: async (hash: Uint8Array) => {
				return wallet.signingKey.sign(hash).serialized
			},
		})
	},
})

userop.setGasPrice(await fetchGasPricePimlico(bundlerUrl)).setPaymaster(usdcPaymaster)

await userop.estimateGas()
await userop.signUserOpHash(userOpHash => wallet.signMessage(userOpHash))

const hash = await userop.send()
console.log('sent', hash)

const receipt = await userop.wait()
console.log('success', receipt.success)
