import { Kernel, KernelAccountAPI } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { INTERFACES } from '@/interfaces'
import { createUSDCPaymaster } from '@/paymasters/usdc-paymaster'
import type { SignerBehavior } from '@/types'
import { toBytes32 } from '@/utils'
import { getECDSAValidator } from '@/validations/getECDSAValidator'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { getBytes, JsonRpcProvider, TypedDataEncoder, Wallet } from 'ethers'
import { ERC4337Bundler, type TypedData } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'
import { executeUserOperation } from './helpers'

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
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // base sepolia
const USDC_PAYMASTER_ADDRESS = '0x31BE08D380A21fc740883c0BC434FcFc88740b58' // base sepolia v0.7

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)

const wallet = new Wallet(dev7702pk)
const signer: SignerBehavior = {
	signHash: async (hash: Uint8Array) => {
		return wallet.signingKey.sign(hash).serialized
	},
}

const ecdsaValidator = getECDSAValidator({ ownerAddress: dev7702 })

const { accountAddress } = await Kernel.getDeployment({
	client,
	validatorAddress: ecdsaValidator.address,
	validatorData: ecdsaValidator.initData,
	salt: toBytes32(2n),
})

console.log('accountAddress', accountAddress)

const usdcPaymaster = await createUSDCPaymaster({
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

const kernelAPI = new KernelAccountAPI({
	validation: new SingleEOAValidation(),
	validatorAddress: ecdsaValidator.address,
})

await executeUserOperation({
	accountAPI: kernelAPI,
	accountAddress,
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
