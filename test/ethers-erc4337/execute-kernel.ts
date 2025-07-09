import { KernelAccountAPI, KernelAPI } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { INTERFACES } from '@/interfaces'
import { PublicPaymaster } from '@/paymasters'
import { toBytes32 } from '@/utils'
import { getECDSAValidator } from '@/validations/getECDSAValidator'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { JsonRpcProvider, Wallet } from 'ethers'
import { ERC4337Bundler } from '@/core'
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

const ecdsaValidator = getECDSAValidator({ ownerAddress: dev7702 })

const signer = {
	signHash: async (hash: Uint8Array) => {
		return wallet.signMessage(hash)
	},
}

const { accountAddress } = await KernelAPI.getDeployment({
	client,
	validatorAddress: ecdsaValidator.address,
	validatorData: ecdsaValidator.initData,
	salt: toBytes32(2n),
})

const kernelAPI = new KernelAccountAPI({
	validation: new SingleEOAValidation(),
	validatorAddress: ecdsaValidator.address,
})

const executions = [
	{
		to: ADDRESS.Counter,
		value: 0n,
		data: INTERFACES.Counter.encodeFunctionData('increment'),
	},
]

await executeUserOperation({
	accountAPI: kernelAPI,
	accountAddress,
	chainId: CHAIN_ID,
	client,
	bundler,
	executions,
	signer,
	paymasterAPI: PublicPaymaster,
})
