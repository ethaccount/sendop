import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers/PimlicoBundler'
import { RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { TIERC1271__factory } from '@/contract-types'
import { TRegistry__factory, TSmartSession__factory } from '@/contract-types/factories'
import type { SessionStruct } from '@/contract-types/TSmartSession'
import { sendop, type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/sendop'
import { INTERFACES } from '@/interfaces'
import { getScheduledTransferDeInitData, getScheduledTransferInitData } from '@/modules/scheduledTransfer'
import { PublicPaymaster } from '@/paymasters'
import { ERC1271_MAGIC_VALUE, type TypedData } from '@/utils'
import { abiEncode, getEncodedFunctionParams, randomBytes32 } from '@/utils/ethers-helper'
import {
	EOAValidator,
	getPermissionId,
	OwnableSmartSessionValidator,
	SMART_SESSIONS_ENABLE_MODE,
	WebAuthnValidator,
} from '@/validators'
import {
	concat,
	getBytes,
	hexlify,
	Interface,
	JsonRpcProvider,
	keccak256,
	parseEther,
	randomBytes,
	toNumber,
	TypedDataEncoder,
	Wallet,
	ZeroAddress,
} from 'ethers'
import { setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { KernelV3Account } from './KernelV3Account'
import { KernelValidationType, type KernelCreationOptions } from './types'
import { OwnableValidator } from '@/validators/OwnableValidator'
import { ERC7579_MODULE_TYPE } from '@/erc7579'

const { chainId, CLIENT_URL, BUNDLER_URL, privateKey, account1 } = await setup()

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
		validator = new EOAValidator({
			address: ADDRESS.ECDSAValidator,
			signer: new Wallet(privateKey),
		})
		pmGetter = new PublicPaymaster(ADDRESS.PublicPaymaster)
	})

	describe('Kerenl deploy and setNumber', () => {
		let account: KernelV3Account
		let creationOptions: KernelCreationOptions
		let computedAddress: string

		beforeAll(async () => {
			creationOptions = {
				salt: hexlify(randomBytes(32)),
				validatorAddress: ADDRESS.ECDSAValidator,
				validatorInitData: EOAValidator.getInitData(signer.address),
			}
		})

		it('should computeAccountAddress', async () => {
			computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)
			expect(computedAddress).not.toBe('0x0000000000000000000000000000000000000000')
		})

		it('should deploy the contract', async () => {
			account = new KernelV3Account({
				address: computedAddress,
				client,
				bundler,
				validator,
				pmGetter,
			})

			const op = await account.deploy(creationOptions)
			const receipt = await op.wait()
			expect(receipt.success).toBe(true)
		}, 100_000)

		it('should setNumber', async () => {
			const op = await account.send([
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

		// ================================ ERC-1271 ================================

		it('should validate signature using ERC-1271 for ECDSAValidator', async () => {
			const dataHash = keccak256('0x1271')

			const typedData: TypedData = [
				{
					name: 'Kernel',
					version: '0.3.1',
					chainId,
					verifyingContract: computedAddress,
				},
				{
					Kernel: [{ name: 'hash', type: 'bytes32' }],
				},
				{
					hash: dataHash,
				},
			]

			const signature = await signer.signTypedData(...typedData)

			const kernelSignature = concat([
				'0x01', // validation type validator
				ADDRESS.ECDSAValidator,
				signature,
			])

			const isValid = await TIERC1271__factory.connect(computedAddress, client).isValidSignature(
				dataHash,
				kernelSignature,
			)

			expect(isValid).toBe(ERC1271_MAGIC_VALUE)
		})

		it('should validate signature using ERC-1271 for OwnableValidator', async () => {
			const creationOptions = {
				salt: randomBytes32(),
				validatorAddress: ADDRESS.OwnableValidator,
				validatorInitData: OwnableValidator.getInitData([signer.address], 1),
			}
			const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)
			const account = new KernelV3Account({
				address: computedAddress,
				client,
				bundler,
				validator,
			})

			const op = await sendop({
				bundler,
				opGetter: account,
				pmGetter,
				initCode: KernelV3Account.getInitCode(creationOptions),
				executions: [],
			})

			const receipt = await op.wait()
			expect(receipt.success).toBe(true)

			const dataHash = keccak256('0x1271')

			const typedData: TypedData = [
				{
					name: 'Kernel',
					version: '0.3.1',
					chainId,
					verifyingContract: computedAddress,
				},
				{
					Kernel: [{ name: 'hash', type: 'bytes32' }],
				},
				{
					hash: dataHash,
				},
			]

			const typedDataHash = TypedDataEncoder.hash(...typedData)
			const signature = await signer.signMessage(getBytes(typedDataHash))

			const kernelSignature = concat([
				'0x01', // validation type: validator
				ADDRESS.OwnableValidator,
				signature,
			])

			const isValid = await TIERC1271__factory.connect(computedAddress, client).isValidSignature(
				dataHash,
				kernelSignature,
			)

			expect(isValid).toBe(ERC1271_MAGIC_VALUE)
		}, 100_000)

		// ================================ Batch execution ================================

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

		it('should install validator module', async () => {
			const op = await account.send([
				{
					to: computedAddress,
					data: KernelV3Account.encodeInstallModule({
						moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
						moduleAddress: ADDRESS.WebAuthnValidator,
						initData: WebAuthnValidator.getInitData({
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
		}, 100_000)

		it('should uninstall validator module', async () => {
			const op = await account.send([
				{
					to: computedAddress,
					data: KernelV3Account.encodeUninstallModule({
						moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
						moduleAddress: ADDRESS.WebAuthnValidator,
						deInitData: WebAuthnValidator.getDeInitData(),
					}),
					value: 0n,
				},
			])
			const receipt = await op.wait()
			expect(receipt.success).toBe(true)
		}, 100_000)

		it('should install and uninstall executor module', async () => {
			// install ScheduledTransfers
			const op = await account.send([
				{
					to: computedAddress,
					value: 0n,
					data: KernelV3Account.encodeInstallModule({
						moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
						moduleAddress: ADDRESS.ScheduledTransfers,
						initData: getScheduledTransferInitData({
							executeInterval: 10,
							numOfExecutions: 3,
							startDate: 1,
							recipient: account1.address,
							token: ZeroAddress,
							amount: parseEther('0.001'),
						}),
					}),
				},
			])
			const receipt = await op.wait()
			expect(receipt.success).toBe(true)

			// uninstall ScheduledTransfers
			const op2 = await account.send([
				{
					to: computedAddress,
					data: KernelV3Account.encodeUninstallModule({
						moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
						moduleAddress: ADDRESS.ScheduledTransfers,
						deInitData: getScheduledTransferDeInitData(),
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
				validatorAddress: ADDRESS.ECDSAValidator,
				validatorInitData: EOAValidator.getInitData(signer.address),
			}
			const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)
			const account = new KernelV3Account({
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
			validatorInitData: EOAValidator.getInitData(signer.address),
		}
		const sessionSalt = randomBytes32()
		const sessionOwner = account1
		const sessionOwnerAddress = account1.address
		const transferRecipient = account1.address

		let computedAddress: string
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
			TSmartSession__factory.createInterface().encodeFunctionData('enableSessions', [sessions]),
		)

		const smartSessionInitData = concat([SMART_SESSIONS_ENABLE_MODE, encodedSessions])

		beforeAll(async () => {
			computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)
			await signer.sendTransaction({
				to: computedAddress,
				value: parseEther('0.003'),
			})
			expect(await client.getBalance(computedAddress)).toBe(parseEther('0.003'))
		})

		it('should schedule transfers', async () => {
			const account = new KernelV3Account({
				address: computedAddress,
				client,
				bundler,
				validator: new EOAValidator({
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
						data: TRegistry__factory.createInterface().encodeFunctionData('trustAttesters', [
							1,
							[RHINESTONE_ATTESTER_ADDRESS],
						]),
					},
					// install smart session module and enable the session
					{
						to: computedAddress,
						value: 0n,
						data: KernelV3Account.encodeInstallModule({
							moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
							moduleAddress: ADDRESS.SmartSession,
							initData: smartSessionInitData,
							selectorData: INTERFACES.KernelV3.getFunction('execute').selector,
						}),
					},
					// install scheduled transfers module
					{
						to: computedAddress,
						value: 0n,
						data: KernelV3Account.encodeInstallModule({
							moduleType: ERC7579_MODULE_TYPE.EXECUTOR,
							moduleAddress: ADDRESS.ScheduledTransfers,
							initData: getScheduledTransferInitData({
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
				opGetter: account,
				initCode: account.getInitCode(creationOptions), // create account
				pmGetter,
			})
			const receipt = await op.wait()
			expect(receipt.success).toBe(true)
		}, 100_000)

		it('should execute the scheduled transfers', async () => {
			const account = new KernelV3Account({
				address: computedAddress,
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
			const op = await account.send([
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
