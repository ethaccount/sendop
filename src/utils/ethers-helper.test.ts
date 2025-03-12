import { describe, expect, it } from 'vitest'
import { randomAddress, randomBytes32 } from './ethers-helper'

describe('Ethers Helper', () => {
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
})
