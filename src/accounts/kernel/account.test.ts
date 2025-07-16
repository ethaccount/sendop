import { executeUserOperation } from '@/../test/helpers'
import { KernelAccountAPI, KernelAPI } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { ERC4337Bundler } from '@/core'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { PublicPaymaster } from '@/paymasters'
import { getECDSAValidator } from '@/validations'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { JsonRpcProvider, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import { beforeEach, describe, expect, it } from 'vitest'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}

const CHAIN_ID = 84532
const existingAccountAddress = '0xc5FF9b12B0130F66e077fa63dFB99355f1bD4DF3'

const alchemyUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(alchemyUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)

const signer = new Wallet(DEV_7702_PK)

const ecdsaValidator = getECDSAValidator({ ownerAddress: signer.address })

const executions = [
	{
		to: ADDRESS.Counter,
		value: 0n,
		data: INTERFACES.Counter.encodeFunctionData('increment'),
	},
]

describe.concurrent('Kernel', () => {
	let gasPrice: {
		maxFeePerGas: bigint
		maxPriorityFeePerGas: bigint
	}

	beforeEach(async () => {
		gasPrice = await fetchGasPricePimlico(pimlicoUrl)
	})

	it('deploy account', async () => {
		const { accountAddress, factory, factoryData } = await KernelAPI.getDeployment({
			client,
			validatorAddress: ecdsaValidator.address,
			validatorData: ecdsaValidator.initData,
		})
		const receipt = await executeUserOperation({
			accountAPI: new KernelAccountAPI({
				validation: new SingleEOAValidation(),
				validatorAddress: ecdsaValidator.address,
			}),
			accountAddress,
			chainId: CHAIN_ID,
			client,
			bundler,
			executions,
			signer,
			paymasterAPI: PublicPaymaster,
			gasPrice,
			deployment: {
				factory,
				factoryData,
			},
		})
		expect(receipt.success).toBe(true)
		console.log('kernel', receipt.sender)
	})

	it('execute counter increment operation', async () => {
		const kernelAPI = new KernelAccountAPI({
			validation: new SingleEOAValidation(),
			validatorAddress: ecdsaValidator.address,
		})

		const receipt = await executeUserOperation({
			accountAPI: kernelAPI,
			accountAddress: existingAccountAddress,
			chainId: CHAIN_ID,
			client,
			bundler,
			signer,
			paymasterAPI: PublicPaymaster,
			executions,
			gasPrice: await fetchGasPricePimlico(pimlico(CHAIN_ID, PIMLICO_API_KEY)),
		})

		expect(receipt.success).toBe(true)
	})
})
