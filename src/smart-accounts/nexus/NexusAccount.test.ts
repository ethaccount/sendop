import ADDRESS from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { sendop, type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/core'
import { randomBytes32 } from '@/utils'
import { ECDSAValidatorModule } from '@/validators'
import { hexlify, Interface, JsonRpcProvider, randomBytes, resolveAddress, toNumber, Wallet } from 'ethers'
import { MyPaymaster, setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { NexusAccount } from './NexusAccount'
import type { NexusCreationOptions } from './types'
import { BICONOMY_ATTESTER_ADDRESS, RHINESTONE_ATTESTER_ADDRESS } from '@/constants'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup()
logger.info(`Chain ID: ${chainId}`)

describe('NexusAccount', () => {
	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: Bundler
	let erc7579Validator: ERC7579Validator
	let pmGetter: PaymasterGetter
	let account: NexusAccount

	beforeAll(() => {
		signer = new Wallet(privateKey)
		client = new JsonRpcProvider(CLIENT_URL)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
			parseError: true,
		})
		erc7579Validator = new ECDSAValidatorModule({
			address: ADDRESS.K1Validator,
			client,
			signer: new Wallet(privateKey),
		})
		pmGetter = new MyPaymaster({
			client,
			paymasterAddress: ADDRESS.CharityPaymaster,
		})

		account = new NexusAccount({
			client,
			bundler,
			erc7579Validator,
			pmGetter,
		})
		logger.info(`Signer: ${signer.address}`)
	})

	describe('Deploy and setNumber', () => {
		let account: NexusAccount
		let creationOptions: NexusCreationOptions
		let deployedAddress: string

		beforeAll(async () => {
			creationOptions = {
				bootstrap: 'initNexusWithSingleValidator',
				salt: hexlify(randomBytes(32)),
				validatorAddress: ADDRESS.K1Validator,
				validatorInitData: await resolveAddress(signer),
				registryAddress: ADDRESS.Registry,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				threshold: 1,
			}
		})

		it('should getNewAddress', async () => {
			deployedAddress = await NexusAccount.getNewAddress(client, creationOptions)
			expect(deployedAddress).not.toBe('0x0000000000000000000000000000000000000000')
		})

		it('should deploy the contract', async () => {
			account = new NexusAccount({
				address: deployedAddress,
				client,
				bundler,
				erc7579Validator,
				pmGetter,
			})

			const op = await account.deploy(creationOptions)
			await op.wait()
			const code = await client.getCode(deployedAddress)
			expect(code).not.toBe('0x')
		}, 100_000)

		it('should setNumber', async () => {
			const number = Math.floor(Math.random() * 1000000)
			const op = await account.send([
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

			const creationOptions: NexusCreationOptions = {
				bootstrap: 'initNexusWithSingleValidator',
				salt: randomBytes32(),
				validatorAddress: ADDRESS.K1Validator,
				validatorInitData: signer.address,
				registryAddress: ADDRESS.Registry,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				threshold: 1,
			}

			const computedAddress = await NexusAccount.getNewAddress(client, creationOptions)
			const account = new NexusAccount({
				address: computedAddress,
				client,
				bundler,
				erc7579Validator,
				pmGetter,
			})

			const op = await sendop({
				bundler,
				opGetter: account,
				pmGetter,
				initCode: account.getInitCode(creationOptions),
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

		// TODO: test batch execution
		// TODO: test install module
	})
})
