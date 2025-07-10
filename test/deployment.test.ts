import { KernelAccountAPI, KernelAPI, NexusAccountAPI, NexusAPI, Safe7579AccountAPI, Safe7579API } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { BICONOMY_ATTESTER_ADDRESS, RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { PublicPaymaster } from '@/paymasters'
import { getECDSAValidator } from '@/validations/getECDSAValidator'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { getOwnableValidator } from '@rhinestone/module-sdk'
import { JsonRpcProvider, Wallet } from 'ethers'
import { ERC4337Bundler } from '@/core'
import { alchemy, pimlico } from 'evm-providers'
import { beforeEach, describe, expect, it } from 'vitest'
import { executeUserOperation } from './helpers'

// bun run test test/deployment.test.ts

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}

const CHAIN_ID = 84532

const alchemyUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(alchemyUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)

const signer = new Wallet(DEV_7702_PK)

const ecdsaValidator = getECDSAValidator({ ownerAddress: signer.address })
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

describe.concurrent('Deploy accounts on base sepolia', () => {
	let gasPrice: {
		maxFeePerGas: bigint
		maxPriorityFeePerGas: bigint
	}

	beforeEach(async () => {
		gasPrice = await fetchGasPricePimlico(pimlicoUrl)
	})

	it('kernel', async () => {
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

	it('nexus', async () => {
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

	it('safe7579', async () => {
		const { accountAddress, factory, factoryData } = await Safe7579API.getDeployment({
			client,
			creationOptions: {
				validatorAddress: ownableValidator.address,
				validatorInitData: ownableValidator.initData,
				owners: [signer.address],
				ownersThreshold: 1,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				attestersThreshold: 1,
			},
		})
		const receipt = await executeUserOperation({
			accountAPI: new Safe7579AccountAPI({
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
		console.log('safe7579', receipt.sender)
	})
})
