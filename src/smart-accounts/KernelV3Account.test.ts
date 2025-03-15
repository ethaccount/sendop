import ADDRESS from '@/addresses'
import { PimlicoBundler } from '@/bundlers/PimlicoBundler'
import { sendop, type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/core'
import { randomBytes32 } from '@/utils/ethers-helper'
import { ECDSAValidatorModule } from '@/validators'
import { hexlify, Interface, JsonRpcProvider, randomBytes, resolveAddress, toNumber, Wallet } from 'ethers'
import { MyPaymaster, setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { KernelV3Account, type KernelCreationOptions } from './KernelV3Account'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup()

logger.info(`Chain ID: ${chainId}`)

describe('KernelV3Account', () => {
	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: Bundler
	let erc7579Validator: ERC7579Validator
	let pmGetter: PaymasterGetter
	let kernel: KernelV3Account

	beforeAll(() => {
		signer = new Wallet(privateKey)
		client = new JsonRpcProvider(CLIENT_URL)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
			parseError: true,
		})
		erc7579Validator = new ECDSAValidatorModule({
			address: ADDRESS.ECDSAValidator,
			client,
			signer: new Wallet(privateKey),
		})
		pmGetter = new MyPaymaster({
			client,
			paymasterAddress: ADDRESS.CharityPaymaster,
		})

		kernel = new KernelV3Account('', {
			client,
			bundler,
			erc7579Validator,
			pmGetter,
		})
		logger.info(`Signer: ${signer.address}`)
	})

	describe('Deploy and setNumber', () => {
		let kernel: KernelV3Account
		let creationOptions: KernelCreationOptions
		let deployedAddress: string

		beforeAll(async () => {
			creationOptions = {
				salt: hexlify(randomBytes(32)),
				validatorAddress: ADDRESS.ECDSAValidator,
				validatorInitData: await resolveAddress(signer),
			}
		})

		it('should getNewAddress', async () => {
			deployedAddress = await KernelV3Account.getNewAddress(client, creationOptions)
			expect(deployedAddress).not.toBe('0x0000000000000000000000000000000000000000')
		})

		it('should deploy the contract', async () => {
			kernel = new KernelV3Account(deployedAddress, {
				client,
				bundler,
				erc7579Validator,
				pmGetter,
			})

			const op = await kernel.deploy(creationOptions)
			await op.wait()
			const code = await client.getCode(deployedAddress)
			expect(code).not.toBe('0x')
		}, 100_000)

		it('should setNumber', async () => {
			const number = Math.floor(Math.random() * 1000000)
			const op = await kernel.send([
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
					value: 0n,
				},
			])
			const receipt = await op.wait()
			const log = receipt.logs[receipt.logs.length - 1]
			expect(toNumber(log.data)).toBe(number)
		}, 100_000)

		it('should deploy and setNumber in one transaction', async () => {
			const number = Math.floor(Math.random() * 1000000)

			const creationOptions = {
				salt: randomBytes32(),
				validatorAddress: ADDRESS.ECDSAValidator,
				validatorInitData: signer.address,
			}
			const computedAddress = await KernelV3Account.getNewAddress(client, creationOptions)
			const kernel = new KernelV3Account(computedAddress, {
				client,
				bundler,
				erc7579Validator,
				pmGetter,
			})

			const op = await sendop({
				bundler,
				opGetter: kernel,
				pmGetter,
				initCode: kernel.getInitCode(creationOptions),
				executions: [
					{
						to: ADDRESS.Counter,
						data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
						value: 0n,
					},
				],
			})
			const receipt = await op.wait()
			const log = receipt.logs[receipt.logs.length - 1]
			expect(toNumber(log.data)).toBe(number)
		}, 100_000)
	})
})
