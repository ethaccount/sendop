import { KernelAccountAPI } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { ERC4337Bundler } from '@/core'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { getPublicPaymaster } from '@/paymasters'
import { getECDSAValidator } from '@/validations/getECDSAValidator'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { getBytes, JsonRpcProvider, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildAccountExecutions } from './helpers'

// Got AA33: https://etherspot.fyi/prime-sdk/contracts/error-codes#aa33-reverted-or-oog

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '', ETHERSPOT_API_KEY = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}
if (!DEV_7702_PK) {
	throw new Error('DEV_7702_PK is not set')
}
if (!ETHERSPOT_API_KEY) {
	throw new Error('ETHERSPOT_API_KEY is not set')
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
		const bundlerUrl = `https://testnet-rpc.etherspot.io/v2/${CHAIN_ID}?api-key=${process.env.ETHERSPOT_API_KEY}`

		client = new JsonRpcProvider(rpcUrl)
		bundler = new ERC4337Bundler(bundlerUrl, CHAIN_ID, {
			staticNetwork: true,
		})

		signer = new Wallet(DEV_7702_PK)

		const ecdsaValidator = getECDSAValidator({ ownerAddress: signer.address })

		kernelAPI = new KernelAccountAPI({
			validation: new SingleEOAValidation(),
			validatorAddress: ecdsaValidator.address,
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

		console.log(op.preview())

		const sig = await signer.signMessage(getBytes(op.hash()))
		op.setSignature(await kernelAPI.formatSignature(sig))

		await op.send()
		const receipt = await op.wait()

		expect(receipt.success).toBe(true)
	})
})
