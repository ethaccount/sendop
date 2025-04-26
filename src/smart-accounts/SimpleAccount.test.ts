import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { sendop } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { randomBytes32 } from '@/utils'
import { JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { Interface } from 'ethers/abi'
import { setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { SimpleAccount } from './SimpleAccount'

const { privateKey } = await setup()

describe('SimpleAccount', () => {
	const CHAIN_ID = 1337n
	const CLIENT_URL = 'http://localhost:8545'
	const BUNDLER_URL = 'http://localhost:4337'

	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: PimlicoBundler
	let account: SimpleAccount
	let computedAddress: string
	const salt = randomBytes32()
	const pmGetter = new PublicPaymaster(ADDRESS.PublicPaymaster)

	beforeAll(async () => {
		signer = new Wallet(privateKey)
		client = new JsonRpcProvider(CLIENT_URL)
		bundler = new PimlicoBundler(CHAIN_ID, BUNDLER_URL, {
			entryPointVersion: 'v0.8',
			parseError: true,
		})
		account = new SimpleAccount({
			client,
			bundler,
			signer,
			pmGetter,
		})
	})

	it('should compute address', async () => {
		computedAddress = await SimpleAccount.computeAccountAddress(client, {
			owner: signer.address,
			salt,
		})
		console.log('computedAddress', computedAddress)
		expect(computedAddress).not.toBe(ZeroAddress)
	})

	it('should deploy', async () => {
		account = account.connect(computedAddress)
		const op = await account.deploy({
			owner: signer.address,
			salt,
		})
		const receipt = await op.wait()
		expect(receipt.success).toBe(true)
	}, 100_000)

	it('should deploy and set number in one transaction', async () => {
		const creationOptions = {
			owner: signer.address,
			salt: randomBytes32(),
		}
		const computedAddress = await SimpleAccount.computeAccountAddress(client, creationOptions)
		const account = new SimpleAccount({
			address: computedAddress,
			client,
			bundler,
			signer,
			pmGetter,
		})
		const op = await sendop({
			bundler,
			opGetter: account,
			executions: [
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
						Math.floor(Math.random() * 10000),
					]),
					value: 0n,
				},
			],
			initCode: account.getInitCode(creationOptions),
			pmGetter,
		})
		const receipt = await op.wait()
		expect(receipt.success).toBe(true)
	}, 100_000)

	it('should set number', async () => {
		const op = await sendop({
			bundler,
			executions: [
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
						Math.floor(Math.random() * 10000),
					]),
					value: 0n,
				},
			],
			opGetter: account,
			pmGetter,
		})

		const receipt = await op.wait()
		expect(receipt.success).toBe(true)
	}, 100_000)

	it('should set number with batch execution', async () => {
		const op = await sendop({
			bundler,
			executions: [
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
						Math.floor(Math.random() * 10000),
					]),
					value: 0n,
				},
				{
					to: ADDRESS.Counter,
					data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
						Math.floor(Math.random() * 10000),
					]),
					value: 0n,
				},
			],
			opGetter: account,
			pmGetter,
		})

		const receipt = await op.wait()
		expect(receipt.success).toBe(true)
	}, 100_000)
})
