import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { isEip7702, sendop } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { JsonRpcProvider, keccak256, Wallet } from 'ethers'
import { Interface } from 'ethers/abi'
import { beforeAll, describe, expect, it } from 'vitest'
import { Simple7702Account } from './Simple7702Account'
import { Simple7702AccountV08__factory } from '@/contract-types'
import { ERC1271_MAGIC_VALUE } from '@/utils'
import { TypedDataEncoder } from 'ethers'

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

	it('should validate signature using ERC-1271', async () => {
		const domain = {
			name: 'ERC-1271',
			version: '1',
			chainId: CHAIN_ID,
			verifyingContract: signer.address,
		}
		const types = {
			Message: [{ name: 'message', type: 'bytes2' }],
		}
		const value = {
			message: '0x1271',
		}
		const hash = TypedDataEncoder.hash(domain, types, value)
		const signature = await signer.signTypedData(domain, types, value)
		const simple7702Account = Simple7702AccountV08__factory.connect(signer.address, client)
		const isValid = await simple7702Account.isValidSignature(hash, signature)
		expect(isValid).toBe(ERC1271_MAGIC_VALUE)
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
