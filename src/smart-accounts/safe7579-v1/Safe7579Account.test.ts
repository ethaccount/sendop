import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { BICONOMY_ATTESTER_ADDRESS, RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { ERC7579_MODULE_TYPE, sendop, type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { findPrevious, randomBytes32, zeroPadLeft } from '@/utils'
import { OwnableValidator } from '@/validators/OwnableValidator'
import { hexlify, Interface, JsonRpcProvider, randomBytes, toNumber, Wallet, parseEther } from 'ethers'
import { ZeroAddress } from 'ethers/constants'
import { setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { Safe7579Account, type Safe7579CreationOptions } from './Safe7579Account'
import { WebAuthnValidatorModule } from '@/index'
import { ISafe7579__factory } from '@/contract-types'
import { getScheduledTransferInitData, getScheduledTransferDeInitData } from '@/modules/scheduledTransfer'

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

		it('should computeAccountAddress', async () => {
			deployedAddress = await Safe7579Account.computeAccountAddress(client, creationOptions)
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

		it('should setNumber with batch execution', async () => {
			const op = await account.send([
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
						Math.floor(Math.random() * 1000000),
					]),
					value: 0n,
				},
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
						Math.floor(Math.random() * 1000000),
					]),
					value: 0n,
				},
			])
			const receipt = await op.wait()
			expect(receipt.success).toBe(true)
		}, 100_000)

		it('should install and uninstall validator module', async () => {
			const op = await account.send([
				{
					to: deployedAddress,
					data: Safe7579Account.encodeInstallModule({
						moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
						moduleAddress: ADDRESS.WebAuthnValidator,
						initData: WebAuthnValidatorModule.getInitData({
							pubKeyX: BigInt(randomBytes32()),
							pubKeyY: BigInt(randomBytes32()),
							authenticatorIdHash: randomBytes32(),
						}),
					}),
					value: 0n,
				},
			])
			const receipt = await op.wait()
			expect(receipt.success).toBe(true)

			const safe = ISafe7579__factory.connect(deployedAddress, client)
			const validators = await safe.getValidatorsPaginated(zeroPadLeft('0x01', 20), 10)
			const prev = findPrevious(validators.array, ADDRESS.WebAuthnValidator)

			const op2 = await account.send([
				{
					to: deployedAddress,
					data: Safe7579Account.encodeUninstallModule({
						moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
						moduleAddress: ADDRESS.WebAuthnValidator,
						deInitData: WebAuthnValidatorModule.getDeInitData(),
						prev,
					}),
					value: 0n,
				},
			])
			const receipt2 = await op2.wait()
			expect(receipt2.success).toBe(true)
		}, 100_000)

		it('should install and uninstall executor module', async () => {
			const op = await account.send([
				{
					to: deployedAddress,
					value: 0n,
					data: Safe7579Account.encodeInstallModule({
						moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
						moduleAddress: ADDRESS.ScheduledTransfers,
						initData: getScheduledTransferInitData({
							executeInterval: 10,
							numOfExecutions: 3,
							startDate: 1,
							recipient: ZeroAddress,
							token: ZeroAddress,
							amount: parseEther('0.001'),
						}),
					}),
				},
			])
			const receipt = await op.wait()
			expect(receipt.success).toBe(true)

			const safe = ISafe7579__factory.connect(deployedAddress, client)
			const validators = await safe.getExecutorsPaginated(zeroPadLeft('0x01', 20), 10)
			const prev = findPrevious(validators.array, ADDRESS.ScheduledTransfers)

			const op2 = await account.send([
				{
					to: deployedAddress,
					data: Safe7579Account.encodeUninstallModule({
						moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
						moduleAddress: ADDRESS.ScheduledTransfers,
						deInitData: getScheduledTransferDeInitData(),
						prev,
					}),
					value: 0n,
				},
			])
			const receipt2 = await op2.wait()
			expect(receipt2.success).toBe(true)
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
			const deployedAddress = await Safe7579Account.computeAccountAddress(client, creationOptions)
			const account = new Safe7579Account({
				address: deployedAddress,
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
