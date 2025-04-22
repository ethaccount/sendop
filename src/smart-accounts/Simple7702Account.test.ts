import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { isEip7702, sendop } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { JsonRpcProvider, Wallet } from 'ethers'
import { Interface } from 'ethers/abi'
import { beforeAll, describe, expect, it } from 'vitest'
import { Simple7702Account } from './Simple7702Account'

describe('Simple7702Account', () => {
	const CHAIN_ID = 1337n
	const CLIENT_URL = 'http://localhost:8545'
	const BUNDLER_URL = 'http://localhost:4337'
	const PUBLIC_PAYMASTER_ADDRESS = '0xcb04730b8aA92B8fC0d1482A0a7BD3420104556D'

	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: PimlicoBundler
	let account: Simple7702Account

	beforeAll(async () => {
		signer = new Wallet(process.env.DEV_7702_PK as string)
		client = new JsonRpcProvider(CLIENT_URL)
		bundler = new PimlicoBundler(CHAIN_ID, BUNDLER_URL, {
			entryPointVersion: 'v0.8',
			parseError: true,
		})
		account = new Simple7702Account({
			address: signer.address,
			client,
			bundler,
			signer,
		})

		expect(await isEip7702(client, signer.address)).toBe(true)
	})

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
			pmGetter: new PublicPaymaster(PUBLIC_PAYMASTER_ADDRESS),
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
			pmGetter: new PublicPaymaster(PUBLIC_PAYMASTER_ADDRESS),
		})

		const receipt = await op.wait()
		expect(receipt.success).toBe(true)
	}, 100_000)
})
