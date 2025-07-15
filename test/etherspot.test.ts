import { KernelAccountAPI } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { ERC4337Bundler, ERC4337Error } from '@/core'
import { INTERFACES } from '@/interfaces'
import { getPublicPaymaster } from '@/paymasters'
import { getECDSAValidator } from '@/validations/getECDSAValidator'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { getBytes, hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { alchemy } from 'evm-providers'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildAccountExecutions } from './helpers'

/*

Differences between Etherspot bundler and Alchemy/Pimlico:
- Does not implement eth_chainId.
- Switching between testnet and mainnet RPC requires more than just changing the chain id in url.
- Use v2 endpoint for entrypoint v0.7; use v3 for entrypoint v0.8.
- eth_estimateUserOperationGas returns maxFeePerGas and maxPriorityFeePerGas (not part of ERC-4337 spec).
- userOpReceipt.receipt.status uses "success" instead of "0x1".
- PublicPaymaster is not supported; ensure the account has sufficient ETH for the following tests.
- Waiting for receipt is slower than with Alchemy or Pimlico.
- Do not perform batch calls to the Etherspot bundler; its response format lacks an id field, 
making it impossible to correlate responses to requests. Note: ethers.js JsonRpcProvider may automatically batch calls.
set staticNetwork: true to prevent this.

*/

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

describe.concurrent('Etherspot', () => {
	let client: JsonRpcProvider
	let bundler: ERC4337Bundler
	let signer: Wallet = new Wallet(DEV_7702_PK)

	const executions = [
		{
			to: ADDRESS.Counter,
			value: 0n,
			data: INTERFACES.Counter.encodeFunctionData('increment'),
		},
	]

	const ecdsaValidator = getECDSAValidator({ ownerAddress: signer.address })

	beforeAll(() => {
		const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
		client = new JsonRpcProvider(rpcUrl)
	})

	it('test counter increment operation using etherspot', async () => {
		const bundlerUrl = `https://testnet-rpc.etherspot.io/v2/${CHAIN_ID}?api-key=${ETHERSPOT_API_KEY}`
		bundler = new ERC4337Bundler(bundlerUrl, CHAIN_ID, {
			staticNetwork: true,
		})

		const kernelAPI = new KernelAccountAPI({
			validation: new SingleEOAValidation(),
			validatorAddress: ecdsaValidator.address,
			config: {
				nonceConfig: {
					key: hexlify(randomBytes(2)),
				},
			},
		})

		const op = await buildAccountExecutions({
			accountAPI: kernelAPI,
			accountAddress: ACCOUNT_ADDRESS,
			chainId: CHAIN_ID,
			client,
			bundler,
			executions,
		})

		await op.estimateGas()

		const sig = await signer.signMessage(getBytes(op.hash()))
		op.setSignature(await kernelAPI.formatSignature(sig))

		await op.send()
		const receipt = await op.wait()

		expect(receipt.success).toBe(true)
	})

	it('test counter increment operation using PublicPaymaster', async () => {
		const bundlerUrl = `https://testnet-rpc.etherspot.io/v2/${CHAIN_ID}?api-key=${ETHERSPOT_API_KEY}`
		bundler = new ERC4337Bundler(bundlerUrl, CHAIN_ID, {
			staticNetwork: true,
		})

		const kernelAPI = new KernelAccountAPI({
			validation: new SingleEOAValidation(),
			validatorAddress: ecdsaValidator.address,
			config: {
				nonceConfig: {
					key: hexlify(randomBytes(2)),
				},
			},
		})

		const op = await buildAccountExecutions({
			accountAPI: kernelAPI,
			accountAddress: ACCOUNT_ADDRESS,
			chainId: CHAIN_ID,
			client,
			bundler,
			executions,
		})

		op.setPaymaster(getPublicPaymaster())

		try {
			await op.estimateGas()
			throw new Error('Test should fail')
		} catch (error) {
			expect(error).toBeInstanceOf(ERC4337Error)
			expect((error as ERC4337Error).message).toBe('FailedOpWithRevert(0,"AA33 reverted",0x)')
		}
	})
})
