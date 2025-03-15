import { toBeHex } from 'ethers'
import { describe, expect, it } from 'vitest'
import { getBytesLength, isBytes, randomAddress, randomBytes32, toBytes32, zeroBytes } from './ethers-helper'

describe('ethers-helper', () => {
	it('should turn bigint to 32 bytes hex string', () => {
		expect(toBytes32(1n)).toBe('0x0000000000000000000000000000000000000000000000000000000000000001')

		// Test large numbers
		const largeNumber = 2n ** 256n // This is larger than 32 bytes
		expect(toBeHex(largeNumber).length).toBeGreaterThan(66) // 66 = '0x' + 64 hex chars (32 bytes)
		expect(() => toBytes32(largeNumber)).toThrow()
	})

	it('isBytes', () => {
		expect(isBytes('0x')).toBe(true)
		expect(isBytes('0x1234')).toBe(true)
		expect(isBytes('0xabcdef0123456789')).toBe(true)
		expect(isBytes('0x123')).toBe(false)
		expect(isBytes('0x12345')).toBe(false)
		expect(isBytes('0x1234', 2)).toBe(true)
		expect(isBytes('0x1234', 1)).toBe(false)
		expect(isBytes('0x12345', 3)).toBe(false)
		expect(isBytes('0x1234%', 2)).toBe(false)
	})

	it('getBytesLength', () => {
		expect(getBytesLength('0x')).toBe(0)
		expect(getBytesLength('0x1234')).toBe(2)
		expect(getBytesLength('0xabcdef0123456789')).toBe(8)
		expect(getBytesLength('0x123')).toBe(0)
		expect(getBytesLength('0x12345')).toBe(0)
	})

	it('zeroBytes', () => {
		expect(zeroBytes()).toBe('0x')
		expect(zeroBytes(1)).toBe('0x00')
		expect(zeroBytes(32)).toBe('0x0000000000000000000000000000000000000000000000000000000000000000')
	})

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
		expect(isBytes('0x1234', 2)).toBe(true)
		expect(isBytes('0xabcdef0123456789', 8)).toBe(true)

		// Invalid cases
		expect(isBytes('0x123', 2)).toBe(false) // Too short
		expect(isBytes('0x12345', 2)).toBe(false) // Too long
		expect(isBytes('1234', 2)).toBe(false) // Missing 0x prefix
		expect(isBytes('0xghijk', 2)).toBe(false) // Invalid hex characters
	})
})
