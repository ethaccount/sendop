import { dataLength, hexlify, JsonRpcProvider, zeroPadBytes } from 'ethers'
import { alchemy } from 'evm-providers'
import { describe, expect, it } from 'vitest'
import { ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS } from './constants'
import { EntryPointV07__factory, EntryPointV08__factory } from './typechain'
import {
	getEmptyUserOp,
	getUserOpHash,
	getUserOpHashV08,
	getUserOpHashWithEip7702,
	INITCODE_EIP7702_MARKER,
	isEip7702UserOp,
	packUserOp,
} from './utils'
import type { UserOperation } from './UserOperation'

describe('utils tests', () => {
	if (!process.env.ALCHEMY_API_KEY) {
		throw new Error('ALCHEMY_API_KEY is not set')
	}

	const CHAIN_ID = 11155111
	const rpcUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
	const client = new JsonRpcProvider(rpcUrl)
	const entryPointV08 = EntryPointV08__factory.connect(ENTRY_POINT_V08_ADDRESS, client)
	const entryPointV07 = EntryPointV07__factory.connect(ENTRY_POINT_V07_ADDRESS, client)

	describe('getUserOpHash for EntryPoint v0.8', () => {
		it('should get correct hash', async () => {
			const userop = getEmptyUserOp()
			const hash = getUserOpHash(userop, ENTRY_POINT_V08_ADDRESS, CHAIN_ID)
			expect(hexlify(hash)).toBe(await entryPointV08.getUserOpHash(packUserOp(userop)))
		})

		it('#isEip7702UserOp', () => {
			const userop = getEmptyUserOp()
			userop.factory = '0x7702000000000000000000000000000000000000'
			expect(isEip7702UserOp(userop)).toBe(true)
		})

		it('#getUserOpHashWith7702 just delegate', async () => {
			const delegateAddress = '0x1234567890123456789012345678901234567890'
			const userop = getEmptyUserOp()
			userop.factory = '0x7702000000000000000000000000000000000000'
			const hash = getUserOpHashV08({ ...userop, factory: delegateAddress }, CHAIN_ID)
			expect(hexlify(getUserOpHashWithEip7702(userop, CHAIN_ID, delegateAddress))).toBe(hexlify(hash))
		})

		it('#getUserOpHashWith7702 with factoryData', async () => {
			const delegateAddress = '0x1234567890123456789012345678901234567890'
			const userop = getEmptyUserOp()
			userop.factory = '0x7702000000000000000000000000000000000000'
			userop.factoryData = '0xb1ab1a'
			const hash = getUserOpHashV08({ ...userop, factory: delegateAddress, factoryData: '0xb1ab1a' }, CHAIN_ID)
			expect(hexlify(getUserOpHashWithEip7702(userop, CHAIN_ID, delegateAddress))).toBe(hexlify(hash))
		})

		it('should get userOpHash with 7702 auth', async () => {
			const userop = getEmptyUserOp()
			const hash = getUserOpHash(userop, ENTRY_POINT_V08_ADDRESS, CHAIN_ID)
			expect(hexlify(hash)).toBe(await entryPointV08.getUserOpHash(packUserOp(userop)))
		})
	})

	describe('getUserOpHash for EntryPoint v0.7', () => {
		it('should get correct hash', async () => {
			const userop = getEmptyUserOp()
			const hash = getUserOpHash(userop, ENTRY_POINT_V07_ADDRESS, CHAIN_ID)
			expect(hexlify(hash)).toBe(await entryPointV07.getUserOpHash(packUserOp(userop)))
		})
	})
})
