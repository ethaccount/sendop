import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers/PimlicoBundler'
import { KernelV3Account } from '@/smart-accounts'
import { connectEntryPointV07 } from '@/utils/contract-helper'
import { EOAValidatorModule } from '@/validators'
import { hexlify, Interface, JsonRpcProvider, parseEther, randomBytes, resolveAddress, toNumber, Wallet } from 'ethers'
import { setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Bundler, ERC7579Validator, PaymasterGetter } from './interface'
import { sendop } from './sendop'
import { PublicPaymaster } from '@/paymasters'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey, isLocal } = await setup()

logger.info(`Chain ID: ${chainId}`)

describe('sendop', () => {
	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: Bundler
	let pmGetter: PaymasterGetter
	let validator: ERC7579Validator

	let creationOptions: {
		salt: string
		validatorAddress: string
		owner: string
	}

	beforeAll(() => {
		client = new JsonRpcProvider(CLIENT_URL)
		signer = new Wallet(privateKey, client)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL)
		pmGetter = new PublicPaymaster(ADDRESS.PublicPaymaster)
		validator = new EOAValidatorModule({
			address: ADDRESS.ECDSAValidator,
			signer,
		})
		creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			owner: signer.address,
		}

		logger.info(`Signer: ${signer.address}`)
	})

	it('pay prefund to computed address for kernel deployment', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			validatorInitData: await resolveAddress(signer),
		}

		const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)

		const kernel = new KernelV3Account({
			address: computedAddress,
			client: new JsonRpcProvider(CLIENT_URL),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			validator,
		})

		// deposit 1 eth to entrypoint for kernel deployment
		const entrypoint = connectEntryPointV07(signer)
		const tx = await entrypoint.depositTo(computedAddress, { value: parseEther('1') })
		await tx.wait()

		// check balance of deployed address
		const balance = await entrypoint.balanceOf(computedAddress)
		expect(balance).toBe(parseEther('1'))

		const op = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [],
			opGetter: kernel,
			initCode: kernel.getInitCode(creationOptions),
		})

		logger.info(`hash: ${op.hash}`)
		await op.wait()
		logger.info('deployed address: ', computedAddress)

		const code = await client.getCode(computedAddress)
		expect(code).not.toBe('0x')
	}, 100_000)

	it('should deploy KernelV3Account with public paymaster', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			validatorInitData: await resolveAddress(signer),
		}

		const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)

		const kernel = new KernelV3Account({
			address: computedAddress,
			client: new JsonRpcProvider(CLIENT_URL),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			validator,
		})

		const op = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [],
			opGetter: kernel,
			pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
			initCode: kernel.getInitCode(creationOptions),
		})
		logger.info(`hash: ${op.hash}`)
		await op.wait()
		logger.info('deployed address: ', computedAddress)

		const code = await client.getCode(computedAddress)
		expect(code).not.toBe('0x')
	}, 100_000)

	it('should deploy KernelV3Account with public paymaster and set number without paymaster', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			validatorInitData: await resolveAddress(signer),
		}

		const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)

		const kernel = new KernelV3Account({
			address: computedAddress,
			client: new JsonRpcProvider(CLIENT_URL),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			validator,
		})

		const op = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [],
			opGetter: kernel,
			pmGetter,
			initCode: kernel.getInitCode(creationOptions),
		})
		logger.info(`hash: ${op.hash}`)
		await op.wait()
		logger.info('deployed address: ', computedAddress)

		const code = await client.getCode(computedAddress)
		expect(code).not.toBe('0x')

		// set number without paymaster
		const number = Math.floor(Math.random() * 10000)

		// deposit 1 eth to entrypoint for kernel deployment
		const entrypoint = connectEntryPointV07(signer)
		const tx = await entrypoint.depositTo(computedAddress, { value: parseEther('1') })
		await tx.wait()

		// check balance of deployed address
		const balance = await entrypoint.balanceOf(computedAddress)
		expect(balance).toBe(parseEther('1'))

		const op2 = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
					value: 0n,
				},
			],
			opGetter: kernel,
		})

		logger.info(`hash: ${op2.hash}`)
		const receipt = await op2.wait()
		logger.info('deployed address: ', computedAddress)

		const log = receipt.logs[receipt.logs.length - 1]
		expect(toNumber(log.data)).toBe(number)
	}, 100_000)

	it('should deploy KernelV3Account and set number in one user operation', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			validatorInitData: await resolveAddress(signer),
		}
		const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)

		const kernel = new KernelV3Account({
			address: computedAddress,
			client: new JsonRpcProvider(CLIENT_URL),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			validator,
		})

		const number = Math.floor(Math.random() * 10000)

		const op = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
					value: 0n,
				},
			],
			opGetter: kernel,
			pmGetter,
			initCode: kernel.getInitCode(creationOptions),
		})

		logger.info(`hash: ${op.hash}`)
		const receipt = await op.wait()
		logger.info('deployed address: ', computedAddress)

		const code = await client.getCode(computedAddress)
		expect(code).not.toBe('0x')
		const log = receipt.logs[receipt.logs.length - 1]
		expect(toNumber(log.data)).toBe(number)
	}, 100_000)
})
