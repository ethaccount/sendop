import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { BICONOMY_ATTESTER_ADDRESS, RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { sendop, type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { randomBytes32 } from '@/utils'
import { OwnableValidator } from '@/validators/OwnableValidator'
import { hexlify, Interface, JsonRpcProvider, randomBytes, toNumber, Wallet } from 'ethers'
import { setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { Safe7579Account, type Safe7579CreationOptions } from './Safe7579Account'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup()
logger.info(`Chain ID: ${chainId}`)

describe('Safe7579Account', () => {
	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: Bundler
	let validator: ERC7579Validator
	let pmGetter: PaymasterGetter
	let account: Safe7579Account

	beforeAll(() => {
		signer = new Wallet(privateKey)
		client = new JsonRpcProvider(CLIENT_URL)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
			parseError: true,
		})
		validator = new OwnableValidator({ signers: [signer] })
		pmGetter = new PublicPaymaster(ADDRESS.PublicPaymaster)

		account = new Safe7579Account({
			client,
			bundler,
			validator,
			pmGetter,
		})
		logger.info(`Signer: ${signer.address}`)
	})

	describe('Deploy and setNumber', () => {
		let account: Safe7579Account
		let creationOptions: Safe7579CreationOptions
		let deployedAddress: string

		beforeAll(async () => {
			creationOptions = {
				salt: hexlify(randomBytes(32)),
				validatorAddress: ADDRESS.OwnableValidator,
				validatorInitData: OwnableValidator.getInitData([signer.address], 1),
				owners: [signer.address],
				ownersThreshold: 1,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				attestersThreshold: 1,
			}
		})

		it('should getNewAddress', async () => {
			deployedAddress = await Safe7579Account.getNewAddress(client, creationOptions)
			expect(deployedAddress).not.toBe('0x0000000000000000000000000000000000000000')
		})

		it('should deploy the contract', async () => {
			account = new Safe7579Account({
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

			const creationOptions = {
				salt: randomBytes32(),
				validatorAddress: ADDRESS.OwnableValidator,
				validatorInitData: OwnableValidator.getInitData([signer.address], 1),
				owners: [signer.address],
				ownersThreshold: 1,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				attestersThreshold: 1,
			}
			const computedAddress = await Safe7579Account.getNewAddress(client, creationOptions)
			const account = new Safe7579Account({
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
	})
})
