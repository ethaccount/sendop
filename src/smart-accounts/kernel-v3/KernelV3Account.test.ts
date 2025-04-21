import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers/PimlicoBundler'
import { RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { Registry__factory, SmartSession__factory } from '@/contract-types/factories'
import type { SessionStruct } from '@/contract-types/SmartSession'
import { ERC7579_MODULE_TYPE, sendop, type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/core'
import { INTERFACES } from '@/interfaces'
import { getScheduledTransferInitData } from '@/modules/scheduledTransfer'
import { abiEncode, getEncodedFunctionParams, randomBytes32 } from '@/utils/ethers-helper'
import {
	EOAValidatorModule,
	getPermissionId,
	OwnableSmartSessionValidator,
	SMART_SESSIONS_ENABLE_MODE,
} from '@/validators'
import {
	concat,
	hexlify,
	Interface,
	JsonRpcProvider,
	parseEther,
	randomBytes,
	resolveAddress,
	toNumber,
	Wallet,
	ZeroAddress,
} from 'ethers'
import { setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { KernelV3Account } from './KernelV3Account'
import { KernelValidationType, type KernelCreationOptions } from './types'
import { PublicPaymaster } from '@/paymasters'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey, account1 } = await setup()

logger.info(`Chain ID: ${chainId}`)

describe('KernelV3Account', () => {
	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: Bundler
	let validator: ERC7579Validator
	let pmGetter: PaymasterGetter

	beforeAll(() => {
		client = new JsonRpcProvider(CLIENT_URL)
		signer = new Wallet(privateKey, client)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
			parseError: true,
		})
		validator = new EOAValidatorModule({
			address: ADDRESS.ECDSAValidator,
			signer: new Wallet(privateKey),
		})
		pmGetter = new PublicPaymaster(ADDRESS.PublicPaymaster)
	})

	describe('Kerenl deploy and setNumber', () => {
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
			kernel = new KernelV3Account({
				address: deployedAddress,
				client,
				bundler,
				validator,
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
			const log = receipt.logs.find(log => log.address === ADDRESS.Counter)
			expect(toNumber(log?.data ?? 0)).toBe(number)
		}, 100_000)

		it('should deploy and setNumber in one transaction', async () => {
			const number = Math.floor(Math.random() * 1000000)

			const creationOptions = {
				salt: randomBytes32(),
				validatorAddress: ADDRESS.ECDSAValidator,
				validatorInitData: signer.address,
			}
			const computedAddress = await KernelV3Account.getNewAddress(client, creationOptions)
			const kernel = new KernelV3Account({
				address: computedAddress,
				client,
				bundler,
				validator,
				pmGetter,
			})

			const op = await sendop({
				bundler,
				opGetter: kernel,
				pmGetter,
				initCode: KernelV3Account.getInitCode(creationOptions),
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

	describe('Kerenl schedule transfers and execute', () => {
		const creationOptions: KernelCreationOptions = {
			salt: randomBytes32(),
			validatorAddress: ADDRESS.ECDSAValidator,
			validatorInitData: signer.address,
		}
		const sessionSalt = randomBytes32()
		const sessionOwner = account1
		const sessionOwnerAddress = account1.address
		const transferRecipient = account1.address

		let deployedAddress: string
		let permissionId: string

		const session: SessionStruct = {
			sessionValidator: ADDRESS.OwnableValidator,
			sessionValidatorInitData: abiEncode(['uint256', 'address[]'], [1, [sessionOwnerAddress]]), // threshold, signers
			salt: sessionSalt,
			userOpPolicies: [
				{
					policy: ADDRESS.SudoPolicy,
					initData: '0x',
				},
			],
			erc7739Policies: {
				erc1271Policies: [],
				allowedERC7739Content: [],
			},
			actions: [
				{
					actionTargetSelector: INTERFACES.ScheduledTransfers.getFunction('executeOrder').selector,
					actionTarget: ADDRESS.ScheduledTransfers,
					actionPolicies: [
						{
							policy: ADDRESS.SudoPolicy,
							initData: '0x',
						},
					],
				},
			],
			permitERC4337Paymaster: true,
		}

		permissionId = getPermissionId(session)

		const sessions: SessionStruct[] = [session]
		const encodedSessions = getEncodedFunctionParams(
			SmartSession__factory.createInterface().encodeFunctionData('enableSessions', [sessions]),
		)

		const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

		beforeAll(async () => {
			deployedAddress = await KernelV3Account.getNewAddress(client, creationOptions)
			await signer.sendTransaction({
				to: deployedAddress,
				value: parseEther('0.003'),
			})
			expect(await client.getBalance(deployedAddress)).toBe(parseEther('0.003'))
		})

		it('should schedule transfers', async () => {
			const kernel = new KernelV3Account({
				address: deployedAddress,
				client,
				bundler,
				validator: new EOAValidatorModule({
					address: ADDRESS.ECDSAValidator,
					signer,
				}),
			})

			const op = await sendop({
				bundler,
				executions: [
					// trust attester
					{
						to: ADDRESS.Registry,
						value: 0n,
						data: Registry__factory.createInterface().encodeFunctionData('trustAttesters', [
							1,
							[RHINESTONE_ATTESTER_ADDRESS],
						]),
					},
					// install smart session module and enable the session
					{
						to: deployedAddress,
						value: 0n,
						data: KernelV3Account.encodeInstallModule({
							moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
							moduleAddress: ADDRESS.SmartSession,
							validatorData: smartSessionInitData,
							selectorData: INTERFACES.KernelV3.getFunction('execute').selector,
						}),
					},
					// install scheduled transfers module
					{
						to: deployedAddress,
						value: 0n,
						data: KernelV3Account.encodeInstallModule({
							moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
							moduleAddress: ADDRESS.ScheduledTransfers,
							executorData: getScheduledTransferInitData({
								executeInterval: 10,
								numOfExecutions: 3,
								startDate: 1,
								recipient: transferRecipient,
								token: ZeroAddress,
								amount: parseEther('0.001'),
							}),
						}),
					},
				],
				opGetter: kernel,
				initCode: kernel.getInitCode(creationOptions), // create account
				pmGetter,
			})
			const receipt = await op.wait()
			expect(receipt.success).toBe(true)
		}, 100_000)

		it('should execute the scheduled transfers', async () => {
			const kernel = new KernelV3Account({
				address: deployedAddress,
				client,
				bundler,
				nonce: {
					type: KernelValidationType.VALIDATOR,
				},
				validator: new OwnableSmartSessionValidator({
					permissionId,
					signer: sessionOwner,
				}),
				pmGetter,
			})

			const jobId = 1
			const op = await kernel.send([
				{
					to: ADDRESS.ScheduledTransfers,
					value: 0n,
					data: INTERFACES.ScheduledTransfers.encodeFunctionData('executeOrder', [jobId]),
				},
			])
			const receipt = await op.wait()
			expect(receipt.success).toBe(true)
		}, 100_000)
	})
})
