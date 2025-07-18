import { KernelAccountAPI } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { ERC4337Bundler } from '@/core'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { getPublicPaymaster } from '@/paymasters'
import { getECDSAValidator } from '@/validations/getECDSAValidator'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { getBytes, hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildAccountExecutions } from './helpers'

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

describe('Kernel Account Execution', () => {
	let client: JsonRpcProvider
	let bundler: ERC4337Bundler
	let signer: Wallet
	let kernelAPI: KernelAccountAPI

	beforeAll(() => {
		const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
		const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

		client = new JsonRpcProvider(rpcUrl)
		bundler = new ERC4337Bundler(bundlerUrl)
		signer = new Wallet(DEV_7702_PK)

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

	it('should execute counter increment operation successfully', async () => {
		const executions = [
			{
				to: ADDRESS.Counter,
				value: 0n,
				data: INTERFACES.Counter.encodeFunctionData('increment'),
			},
		]

		const op = await buildAccountExecutions({
			accountAPI: kernelAPI,
			accountAddress: ACCOUNT_ADDRESS,
			chainId: CHAIN_ID,
			client,
			bundler,
			executions,
		})

		op.setPaymaster(getPublicPaymaster())
		op.setGasPrice(await fetchGasPricePimlico(pimlico(CHAIN_ID, PIMLICO_API_KEY)))

		await op.estimateGas()

		const sig = await signer.signMessage(getBytes(op.hash()))
		op.setSignature(await kernelAPI.formatSignature(sig))

		await op.send()
		const receipt = await op.wait()

		expect(receipt.success).toBe(true)
	})
})
