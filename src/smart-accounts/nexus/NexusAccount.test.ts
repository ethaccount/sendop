import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { BICONOMY_ATTESTER_ADDRESS, RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { sendop, type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/core'
import { PublicPaymaster } from '@/index'
import { randomBytes32 } from '@/utils'
import { OwnableValidator } from '@/validators/OwnableValidator'
import { Interface, JsonRpcProvider, toNumber, Wallet } from 'ethers'
import { setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { NexusAccount } from './NexusAccount'
import type { NexusCreationOptions } from './types'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup()
logger.info(`Chain ID: ${chainId}`)

describe('NexusAccount', () => {
	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: Bundler
	let validator: ERC7579Validator
	let pmGetter: PaymasterGetter

	beforeAll(() => {
		signer = new Wallet(privateKey)
		client = new JsonRpcProvider(CLIENT_URL)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
			parseError: true,
			debug: true,
		})
		validator = new OwnableValidator({ signers: [new Wallet(privateKey)] })
		pmGetter = new PublicPaymaster(ADDRESS.PublicPaymaster)

		logger.info(`Signer: ${signer.address}`)
	})

	describe('Deploy Nexus and setNumber', () => {
		let account: NexusAccount
		let creationOptions: NexusCreationOptions
		let deployedAddress: string

		beforeAll(async () => {
			creationOptions = {
				bootstrap: 'initNexusWithSingleValidator',
				salt: randomBytes32(),
				validatorAddress: ADDRESS.OwnableValidator,
				validatorInitData: OwnableValidator.getInitData([signer.address], 1),
				registryAddress: ADDRESS.Registry,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				threshold: 1,
			}
		})

		it('should computeAccountAddress', async () => {
			deployedAddress = await NexusAccount.computeAccountAddress(client, creationOptions)
			expect(deployedAddress).not.toBe('0x0000000000000000000000000000000000000000')
		})

		it('should deploy the contract', async () => {
			account = new NexusAccount({
				address: deployedAddress,
				client,
				bundler,
				validator,
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
			const log = receipt.logs.find(log => log.address === ADDRESS.Counter)
			expect(toNumber(log?.data ?? 0)).toBe(number)
		}, 100_000)

		it('should deploy and setNumber in one transaction', async () => {
			const number = Math.floor(Math.random() * 1000000)

			const creationOptions: NexusCreationOptions = {
				bootstrap: 'initNexusWithSingleValidator',
				salt: randomBytes32(),
				validatorAddress: ADDRESS.OwnableValidator,
				validatorInitData: OwnableValidator.getInitData([signer.address], 1),
				registryAddress: ADDRESS.Registry,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				threshold: 1,
			}

			const computedAddress = await NexusAccount.computeAccountAddress(client, creationOptions)
			const account = new NexusAccount({
				address: computedAddress,
				client,
				bundler,
				validator,
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
			const log = receipt.logs.find(log => log.address === ADDRESS.Counter)
			expect(toNumber(log?.data ?? 0)).toBe(number)
		}, 100_000)

		// TODO: test batch execution
		// TODO: test install module
	})
})
