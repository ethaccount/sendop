import { executeUserOperation } from '@/../test/helpers'
import { NexusAccountAPI, NexusAPI } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { BICONOMY_ATTESTER_ADDRESS } from '@/constants'
import { ERC4337Bundler } from '@/core'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { PublicPaymaster } from '@/paymasters'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { getOwnableValidator, RHINESTONE_ATTESTER_ADDRESS } from '@rhinestone/module-sdk'
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
const existingNexusAddress = '0x0c748E9265FBaCffdBcEA8ab25A1e76585372837'

const alchemyUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(alchemyUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)

const signer = new Wallet(DEV_7702_PK)

// const ecdsaValidator = getECDSAValidator({ ownerAddress: signer.address })
const ownableValidator = getOwnableValidator({
	owners: [signer.address as `0x${string}`],
	threshold: 1,
})

const executions = [
	{
		to: ADDRESS.Counter,
		value: 0n,
		data: INTERFACES.Counter.encodeFunctionData('increment'),
	},
]

describe.concurrent('Nexus', () => {
	let gasPrice: {
		maxFeePerGas: bigint
		maxPriorityFeePerGas: bigint
	}

	beforeEach(async () => {
		gasPrice = await fetchGasPricePimlico(pimlicoUrl)
	})

	it('deploy account', async () => {
		const { accountAddress, factory, factoryData } = await NexusAPI.getDeployment({
			client,
			creationOptions: {
				bootstrap: 'initNexusWithSingleValidator',
				validatorAddress: ownableValidator.address,
				validatorInitData: ownableValidator.initData,
				registryAddress: ADDRESS.Registry,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				threshold: 1,
			},
		})
		const receipt = await executeUserOperation({
			accountAPI: new NexusAccountAPI({
				validation: new SingleEOAValidation(),
				validatorAddress: ownableValidator.address,
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
		console.log('nexus', receipt.sender)
	})

	it('execute counter increment operation', async () => {
		const nexusAPI = new NexusAccountAPI({
			validation: new SingleEOAValidation(),
			validatorAddress: ownableValidator.address,
		})

		const receipt = await executeUserOperation({
			accountAPI: nexusAPI,
			accountAddress: existingNexusAddress,
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
