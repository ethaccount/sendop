import { ADDRESS } from '@/addresses'
import { sendop, type Bundler } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { RpcProvider } from '@/RpcProvider'
import { KernelV3Account } from '@/smart-accounts'
import { EOAValidator } from '@/validators'
import { hexlify, JsonRpcProvider, randomBytes, resolveAddress, Wallet } from 'ethers'
import { setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { AlchemyBundler } from './AlchemyBundler'

const { logger, chainId, ALCHEMY_API_KEY, privateKey, CLIENT_URL } = await setup({
	chainId: 11155111n,
})

logger.info(`Chain ID: ${chainId}`)

const BUNDLER_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

describe.skip('AlchemyBundler', () => {
	let rpcProvider: RpcProvider
	let alchemyBundler: Bundler
	let client: JsonRpcProvider
	let signer: Wallet

	beforeAll(() => {
		rpcProvider = new RpcProvider(BUNDLER_URL)
		alchemyBundler = new AlchemyBundler(chainId, BUNDLER_URL)
		client = new JsonRpcProvider(CLIENT_URL)
		signer = new Wallet(privateKey, client)
	})

	let gasPrice: string
	let maxPriorityFeePerGas: string

	it('should get gas price by eth_gasPrice', async () => {
		const _gasPrice = (await rpcProvider.send({ method: 'eth_gasPrice' })) as string // hex string
		if (!_gasPrice || _gasPrice === '0x0' || _gasPrice === '0x') {
			throw new Error('Invalid gas price response from bundler')
		}
		logger.info(`Gas price: ${_gasPrice}`)
		expect(_gasPrice).toBeDefined()
		gasPrice = _gasPrice
	})

	it('should get baseFeePerGas by eth_getBlockByNumber', async () => {
		const _baseFeePerGas = await rpcProvider.send({ method: 'eth_getBlockByNumber', params: ['latest', true] })
		logger.info(`baseFeePerGas: ${_baseFeePerGas}`)
		expect(_baseFeePerGas).toBeDefined()
	})

	it('should get maxPriorityFeePerGas by rundler_maxPriorityFeePerGas', async () => {
		const _maxPriorityFeePerGas = await rpcProvider.send({ method: 'rundler_maxPriorityFeePerGas' })
		logger.info(`maxPriorityFeePerGas: ${_maxPriorityFeePerGas}`)
		expect(_maxPriorityFeePerGas).toBeDefined()
		maxPriorityFeePerGas = _maxPriorityFeePerGas
	})

	it('should deploy kernel', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			validatorInitData: await resolveAddress(signer),
		}

		const deployedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)

		const kernel = new KernelV3Account({
			address: deployedAddress,
			client,
			bundler: alchemyBundler,
			validator: new EOAValidator({
				address: ADDRESS.ECDSAValidator,
				signer,
			}),
		})

		const op = await sendop({
			bundler: alchemyBundler,
			executions: [],
			opGetter: kernel,
			pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
			initCode: kernel.getInitCode(creationOptions),
		})

		logger.info(`hash: ${op.hash}`)
		await op.wait()
		logger.info('deployed address: ', deployedAddress)

		const code = await client.getCode(deployedAddress)
		expect(code).not.toBe('0x')
	}, 100000)

	it.skip('cannot batch request eth_gasPrice and rundler_maxPriorityFeePerGas', async () => {
		const batchRequests = [{ method: 'eth_gasPrice' }, { method: 'rundler_maxPriorityFeePerGas' }]

		const results = await rpcProvider.sendBatch(batchRequests)
		logger.info(`Batch results: ${JSON.stringify(results)}`)

		// Verify both requests were successful
		expect(results.length).toBe(2)
		expect(results.every(r => r.status === 'fulfilled')).toBe(true)

		// Check gas price response
		const gasPriceResponse = results[0]
		expect(gasPriceResponse.method).toBe('eth_gasPrice')
		const gasPrice = gasPriceResponse.value as string
		expect(gasPrice).toBeDefined()
		expect(gasPrice).not.toBe('0x0')
		expect(gasPrice).not.toBe('0x')

		// Check maxPriorityFeePerGas response
		const maxPriorityResponse = results[1]
		expect(maxPriorityResponse.method).toBe('rundler_maxPriorityFeePerGas')
		expect(maxPriorityResponse.value).toBeDefined()

		logger.info(`Batch results - Gas price: ${gasPrice}, maxPriorityFeePerGas: ${maxPriorityResponse.value}`)
	})
})
