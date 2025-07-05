import { concat, hexlify, JsonRpcProvider } from 'ethers'
import { alchemy } from 'evm-providers'
import { describe, expect, it } from 'vitest'
import { EIP7702_PREFIX, ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS } from './constants'
import { packUserOp } from './conversion-utils'
import { EntryPointV07__factory, EntryPointV08__factory } from './typechain'
import { getEmptyUserOp, getUserOpHash, getUserOpHashV08, getUserOpHashWithEip7702, isEip7702UserOp } from './utils'

const SIMPLE_7702_ACCOUNT_ADDRESS = '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9'
const CHAIN_ID = 11155111

describe('utils tests', () => {
	if (!process.env.ALCHEMY_API_KEY) {
		throw new Error('ALCHEMY_API_KEY is not set')
	}

	const rpcUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
	const client = new JsonRpcProvider(rpcUrl)
	const entryPointV08 = EntryPointV08__factory.connect(ENTRY_POINT_V08_ADDRESS, client)
	const entryPointV07 = EntryPointV07__factory.connect(ENTRY_POINT_V07_ADDRESS, client)

	describe('getUserOpHash for EntryPoint v0.8', () => {
		it('should return the same hash as calculated locally', async () => {
			const userop = getEmptyUserOp()
			const hash = getUserOpHash(userop, ENTRY_POINT_V08_ADDRESS, CHAIN_ID)
			expect(hexlify(hash)).toBe(await entryPointV08.getUserOpHash(packUserOp(userop)))
		})

		describe('UserOp with EIP-7702', () => {
			it('#isEip7702UserOp', () => {
				const userop = getEmptyUserOp()
				userop.factory = '0x7702000000000000000000000000000000000000'
				expect(isEip7702UserOp(userop)).toBe(true)
			})

			describe('#getUserOpHashWith7702', () => {
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
					const hash = getUserOpHashV08(
						{ ...userop, factory: delegateAddress, factoryData: '0xb1ab1a' },
						CHAIN_ID,
					)
					expect(hexlify(getUserOpHashWithEip7702(userop, CHAIN_ID, delegateAddress))).toBe(hexlify(hash))
				})

				it('should return the same hash as calculated locally', async () => {
					const delegateAddress = SIMPLE_7702_ACCOUNT_ADDRESS
					const userop = getEmptyUserOp()
					userop.sender = '0x1234567890123456789012345678901234567890'
					userop.factory = '0x7702'

					const hash = getUserOpHashWithEip7702(userop, CHAIN_ID, delegateAddress)

					const useropHash = getUserOpHashV08(userop, CHAIN_ID)
					expect(hexlify(useropHash)).not.toBe(hexlify(hash))

					const onchainHash: string = await client.send('eth_call', [
						{
							to: ENTRY_POINT_V08_ADDRESS,
							data: entryPointV08.interface.encodeFunctionData('getUserOpHash', [packUserOp(userop)]),
						},
						'latest',
						{
							// State override
							'0x1234567890123456789012345678901234567890': {
								code: concat([EIP7702_PREFIX, delegateAddress]),
							},
						},
					])

					expect(hexlify(hash)).toBe(onchainHash)

					// Test with factoryData

					userop.factoryData = '0xb1ab1a'
					const hash2 = getUserOpHashWithEip7702(userop, CHAIN_ID, delegateAddress)

					const useropHash2 = getUserOpHashV08(userop, CHAIN_ID)
					expect(hexlify(useropHash2)).not.toBe(hexlify(hash2))

					const onchainHash2: string = await client.send('eth_call', [
						{
							to: ENTRY_POINT_V08_ADDRESS,
							data: entryPointV08.interface.encodeFunctionData('getUserOpHash', [packUserOp(userop)]),
						},
						'latest',
						{
							// State override
							'0x1234567890123456789012345678901234567890': {
								code: concat([EIP7702_PREFIX, delegateAddress]),
							},
						},
					])

					expect(hexlify(hash2)).toBe(onchainHash2)
				})
			})
		})
	})

	describe('getUserOpHash for EntryPoint v0.7', () => {
		it('should return the same hash as calculated locally', async () => {
			const userop = getEmptyUserOp()
			const hash = getUserOpHash(userop, ENTRY_POINT_V07_ADDRESS, CHAIN_ID)
			expect(hexlify(hash)).toBe(await entryPointV07.getUserOpHash(packUserOp(userop)))
		})
	})
})
