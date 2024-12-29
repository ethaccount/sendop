import { hexlify, Interface, JsonRpcProvider, randomBytes, toNumber, Wallet } from 'ethers'
import { CHARITY_PAYMASTER, COUNTER, ECDSA_VALIDATOR } from 'test/utils/addresses'
import { PimlicoBundler } from 'test/utils/bundler'
import { ExecBuilder } from 'test/utils/exec_builders'
import { MyPaymaster, PimlicoPaymaster } from 'test/utils/pm_builders'
import { setup } from 'test/utils/setup'
import { beforeAll, describe, expect, it } from 'vitest'
import { ECDSAValidator } from '../validators/ecdsa_validator'
import { MyAccount } from '../vendors/my_account'
import { sendop } from './sendop'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, PRIVATE_KEY } = setup({
	chainId: '11155111',
})

logger.info(`Chain ID: ${chainId}`)

describe('sendop', () => {
	let signer: Wallet
	let client: JsonRpcProvider

	beforeAll(() => {
		signer = new Wallet(PRIVATE_KEY)
		client = new JsonRpcProvider(CLIENT_URL)
		logger.info(`Signer: ${signer.address}`)
	})

	it('should set number with charity paymaster', async () => {
		const FROM = '0x182260E0b7fF3B72DeAa6c99f1a50F2380a4Fb00'
		logger.info(`FROM: ${FROM}`)
		const bundler = new PimlicoBundler(chainId, BUNDLER_URL)
		const number = Math.floor(Math.random() * 10000)

		const op = await sendop({
			bundler,
			from: FROM,
			executions: [
				{
					to: COUNTER,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
					value: '0x0',
				},
			],
			execBuilder: new ExecBuilder({
				client: new JsonRpcProvider(CLIENT_URL),
				vendor: new MyAccount(),
				validator: new ECDSAValidator({
					address: ECDSA_VALIDATOR,
					clientUrl: CLIENT_URL,
					signer,
				}),
				from: FROM,
			}),
			pmBuilder: new MyPaymaster({
				chainId,
				clientUrl: CLIENT_URL,
				paymasterAddress: CHARITY_PAYMASTER,
			}),
		})

		const receipt = await op.wait()
		const log = receipt.logs[receipt.logs.length - 1]

		expect(toNumber(log.data)).toBe(number)
	}, 100_000)

	it('should set number with pimlico paymaster', async () => {
		const FROM = '0x182260E0b7fF3B72DeAa6c99f1a50F2380a4Fb00'
		logger.info(`FROM: ${FROM}`)
		const bundler = new PimlicoBundler(chainId, BUNDLER_URL)

		const number = Math.floor(Math.random() * 10000)

		const op = await sendop({
			bundler,
			from: FROM,
			executions: [
				{
					to: COUNTER,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
					value: '0x0',
				},
			],
			execBuilder: new ExecBuilder({
				client: new JsonRpcProvider(CLIENT_URL),
				vendor: new MyAccount(),
				validator: new ECDSAValidator({
					address: ECDSA_VALIDATOR,
					clientUrl: CLIENT_URL,
					signer,
				}),
				from: FROM,
			}),
			pmBuilder: new PimlicoPaymaster({
				chainId,
				url: BUNDLER_URL,
			}),
		})

		const receipt = await op.wait()
		const log = receipt.logs[receipt.logs.length - 1]

		expect(toNumber(log.data)).toBe(number)
	}, 100000)

	it('should deploy MyAccount', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ECDSA_VALIDATOR,
			owner: await new Wallet(PRIVATE_KEY).getAddress(),
		}
		const vendor = new MyAccount(CLIENT_URL, creationOptions)
		const deployedAddress = await vendor.getAddress()
		const FROM = deployedAddress

		const op = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			from: FROM,
			executions: [],
			execBuilder: new ExecBuilder({
				client: new JsonRpcProvider(CLIENT_URL),
				vendor,
				validator: new ECDSAValidator({
					address: ECDSA_VALIDATOR,
					clientUrl: CLIENT_URL,
					signer: new Wallet(PRIVATE_KEY),
				}),
				from: FROM,
				isCreation: true,
			}),
			pmBuilder: new MyPaymaster({
				chainId,
				clientUrl: CLIENT_URL,
				paymasterAddress: CHARITY_PAYMASTER,
			}),
		})
		await op.wait()
		const code = await client.getCode(deployedAddress)
		expect(code).not.toBe('0x')
	}, 100_000)

	it('should deploy MyAccount and set number in one user operation', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ECDSA_VALIDATOR,
			owner: await new Wallet(PRIVATE_KEY).getAddress(),
		}
		const vendor = new MyAccount(CLIENT_URL, creationOptions)
		const deployedAddress = await vendor.getAddress()
		const FROM = deployedAddress
		const number = Math.floor(Math.random() * 10000)

		const op = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			from: FROM,
			executions: [
				{
					to: COUNTER,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
					value: '0x0',
				},
			],
			execBuilder: new ExecBuilder({
				client: new JsonRpcProvider(CLIENT_URL),
				vendor,
				validator: new ECDSAValidator({
					address: ECDSA_VALIDATOR,
					clientUrl: CLIENT_URL,
					signer: new Wallet(PRIVATE_KEY),
				}),
				from: FROM,
				isCreation: true,
			}),
			pmBuilder: new MyPaymaster({
				chainId,
				clientUrl: CLIENT_URL,
				paymasterAddress: CHARITY_PAYMASTER,
			}),
		})
		const receipt = await op.wait()
		const code = await client.getCode(deployedAddress)
		expect(code).not.toBe('0x')
		const log = receipt.logs[receipt.logs.length - 1]
		expect(toNumber(log.data)).toBe(number)
	}, 100_000)
})
