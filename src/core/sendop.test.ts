import { hexlify, Interface, JsonRpcProvider, parseEther, randomBytes, resolveAddress, toNumber, Wallet } from 'ethers'
import { MyPaymaster, PimlicoPaymaster, setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { sendop } from './sendop'
import type { Bundler, ERC7579Validator, PaymasterGetter } from './types'
import { PimlicoBundler } from '@/bundlers/PimlicoBundler'
import { ECDSAValidatorModule } from '@/validators'
import ADDRESS from '@/addresses'
import { KernelAccount } from '@/smart_accounts'
import { connectEntryPointV07 } from '@/utils/contract-getter'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey, isLocal } = await setup()

logger.info(`Chain ID: ${chainId}`)

describe('sendop', () => {
	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: Bundler
	let pmGetter: PaymasterGetter
	let erc7579Validator: ERC7579Validator

	let creationOptions: {
		salt: string
		validatorAddress: string
		owner: string
	}

	beforeAll(() => {
		client = new JsonRpcProvider(CLIENT_URL)
		signer = new Wallet(privateKey, client)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL)
		pmGetter = new MyPaymaster({
			client,
			paymasterAddress: ADDRESS.CharityPaymaster,
		})
		erc7579Validator = new ECDSAValidatorModule({
			address: ADDRESS.ECDSAValidator,
			client,
			signer,
		})
		creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			owner: signer.address,
		}

		logger.info(`Signer: ${signer.address}`)
	})

	// TODO: fix this test
	it.skip('cannot pay prefund for kernel deployment when estimateUserOperationGas with reason: AA13 initCode failed or OOG', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			initData: await resolveAddress(signer),
		}

		const deployedAddress = await KernelAccount.getNewAddress(client, creationOptions)

		const kernel = new KernelAccount(deployedAddress, {
			client: new JsonRpcProvider(CLIENT_URL),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			erc7579Validator,
		})

		// deposit 1 eth to entrypoint for kernel deployment
		const entrypoint = connectEntryPointV07(signer)
		const tx = await entrypoint.depositTo(deployedAddress, { value: parseEther('1') })
		await tx.wait()

		// check balance of deployed address
		const balance = await entrypoint.balanceOf(deployedAddress)
		expect(balance).toBe(parseEther('1'))

		const op = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [],
			opGetter: kernel,
			initCode: kernel.getInitCode(creationOptions),
		})

		logger.info(`hash: ${op.hash}`)
		await op.wait()
		logger.info('deployed address: ', deployedAddress)

		const code = await client.getCode(deployedAddress)
		expect(code).not.toBe('0x')
	}, 100_000)

	it('should deploy KernelAccount with charity paymaster', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			initData: await resolveAddress(signer),
		}

		const deployedAddress = await KernelAccount.getNewAddress(client, creationOptions)

		const kernel = new KernelAccount(deployedAddress, {
			client: new JsonRpcProvider(CLIENT_URL),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			erc7579Validator,
			pmGetter,
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
		logger.info('deployed address: ', deployedAddress)

		const code = await client.getCode(deployedAddress)
		expect(code).not.toBe('0x')
	}, 100_000)

	it('should deploy KernelAccount with charity paymaster and set number without paymaster', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			initData: await resolveAddress(signer),
		}

		const deployedAddress = await KernelAccount.getNewAddress(client, creationOptions)

		const kernel = new KernelAccount(deployedAddress, {
			client: new JsonRpcProvider(CLIENT_URL),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			erc7579Validator,
			pmGetter,
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
		logger.info('deployed address: ', deployedAddress)

		const code = await client.getCode(deployedAddress)
		expect(code).not.toBe('0x')

		// set number without paymaster
		const number = Math.floor(Math.random() * 10000)

		// deposit 1 eth to entrypoint for kernel deployment
		const entrypoint = connectEntryPointV07(signer)
		const tx = await entrypoint.depositTo(deployedAddress, { value: parseEther('1') })
		await tx.wait()

		// check balance of deployed address
		const balance = await entrypoint.balanceOf(deployedAddress)
		expect(balance).toBe(parseEther('1'))

		const op2 = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
					value: '0x0',
				},
			],
			opGetter: kernel,
		})

		logger.info(`hash: ${op2.hash}`)
		const receipt = await op2.wait()
		logger.info('deployed address: ', deployedAddress)

		const log = receipt.logs[receipt.logs.length - 1]
		expect(toNumber(log.data)).toBe(number)
	}, 100_000)

	it('should deploy KernelAccount and set number in one user operation', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			initData: await resolveAddress(signer),
		}
		const deployedAddress = await KernelAccount.getNewAddress(client, creationOptions)

		const kernel = new KernelAccount(deployedAddress, {
			client: new JsonRpcProvider(CLIENT_URL),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			erc7579Validator,
			pmGetter,
		})

		const number = Math.floor(Math.random() * 10000)

		const op = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
					value: '0x0',
				},
			],
			opGetter: kernel,
			pmGetter: new MyPaymaster({
				client,
				paymasterAddress: ADDRESS.CharityPaymaster,
			}),
			initCode: kernel.getInitCode(creationOptions),
		})

		logger.info(`hash: ${op.hash}`)
		const receipt = await op.wait()
		logger.info('deployed address: ', deployedAddress)

		const code = await client.getCode(deployedAddress)
		expect(code).not.toBe('0x')
		const log = receipt.logs[receipt.logs.length - 1]
		expect(toNumber(log.data)).toBe(number)
	}, 100_000)
})
