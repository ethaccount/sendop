import { describe, expect, it } from 'vitest'
import { isHexString, randomAddress, randomBytes32 } from './ethers-helper'

describe('ethers-helper', () => {
	it('should create random address', async () => {
		const address = randomAddress()
		expect(address).toBeDefined()
		expect(address.length).toBe(42)
		expect(address.startsWith('0x')).toBe(true)

		const address2 = randomAddress()
		expect(address).not.toBe(address2)
	})

	it('should create random bytes32', async () => {
		const salt = randomBytes32()
		expect(salt).toBeDefined()
		expect(salt.length).toBe(66)
		expect(salt.startsWith('0x')).toBe(true)

		const salt2 = randomBytes32()
		expect(salt).not.toBe(salt2)
	})

	it('should validate hex strings correctly', () => {
		// Valid hex strings
		expect(isHexString('0x1234', 2)).toBe(true)
		expect(isHexString('0xabcdef0123456789', 8)).toBe(true)

		// Invalid cases
		expect(isHexString('0x123', 2)).toBe(false) // Too short
		expect(isHexString('0x12345', 2)).toBe(false) // Too long
		expect(isHexString('1234', 2)).toBe(false) // Missing 0x prefix
		expect(isHexString('0xghijk', 2)).toBe(false) // Invalid hex characters
	})
})
