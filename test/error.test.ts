import { KernelAccountAPI } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { ERC4337Bundler, ERC4337Error } from '@/core'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { PublicPaymaster } from '@/paymasters'
import { getECDSAValidator } from '@/validations/getECDSAValidator'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import { beforeAll, describe, expect, it } from 'vitest'
import { executeUserOperation } from './helpers'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}
if (!DEV_7702_PK) {
	throw new Error('DEV_7702_PK is not set')
}

const CHAIN_ID = 84532
const ACCOUNT_ADDRESS = '0x960CBf515F3DcD46f541db66C76Cf7acA5BEf4C7'

describe('Error handling in ERC4337Bundler', () => {
	let client: JsonRpcProvider
	let bundler: ERC4337Bundler
	let signer: Wallet
	let kernelAPI: KernelAccountAPI

	const executions = [
		{
			to: ADDRESS.Counter,
			value: 0n,
			data: INTERFACES.Counter.encodeFunctionData('increment'),
		},
	]

	beforeAll(() => {
		const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
		const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

		client = new JsonRpcProvider(rpcUrl)
		bundler = new ERC4337Bundler(bundlerUrl)
		signer = new Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')

		const ecdsaValidator = getECDSAValidator({ ownerAddress: signer.address })

		kernelAPI = new KernelAccountAPI({
			validation: new SingleEOAValidation(),
			validatorAddress: ecdsaValidator.address,
			config: {
				nonceConfig: {
					key: hexlify(randomBytes(2)),
				},
			},
		})
	})

	it('test signature error using pimlico', async () => {
		try {
			await executeUserOperation({
				accountAPI: kernelAPI,
				accountAddress: ACCOUNT_ADDRESS,
				chainId: CHAIN_ID,
				client,
				bundler,
				signer,
				paymasterAPI: PublicPaymaster,
				executions,
				gasPrice: await fetchGasPricePimlico(pimlico(CHAIN_ID, PIMLICO_API_KEY)),
			})
		} catch (error) {
			console.error(error)
			expect(error).toBeInstanceOf(ERC4337Error)

			if (error instanceof ERC4337Error) {
				expect(error.message).toBe('UserOperation reverted with reason: AA24 signature error')
				expect(error.code).toBe(-32500)
				expect(error.method).toBe('eth_sendUserOperation')
				expect(error.payload).toBeDefined()
			}
		}
	})

	it('test signature error using alchemy', async () => {
		try {
			await executeUserOperation({
				accountAPI: kernelAPI,
				accountAddress: ACCOUNT_ADDRESS,
				chainId: CHAIN_ID,
				client,
				bundler: new ERC4337Bundler(alchemy(CHAIN_ID, ALCHEMY_API_KEY)),
				signer,
				paymasterAPI: PublicPaymaster,
				executions,
				gasPrice: await fetchGasPricePimlico(pimlico(CHAIN_ID, PIMLICO_API_KEY)),
			})
		} catch (error) {
			console.error(error)
			expect(error).toBeInstanceOf(ERC4337Error)

			if (error instanceof ERC4337Error) {
				expect(error.message).toBe('Invalid account signature')
				expect(error.code).toBe(-32507)
				expect(error.method).toBe('eth_sendUserOperation')
				expect(error.payload).toBeDefined()
			}
		}
	})
})
