import { setup } from 'test/utils'
import { describe, expect, it } from 'vitest'
import { KernelV3Account } from './kernel-v3/KernelV3Account'

const { logger, chainId } = await setup()

logger.info(`Chain ID: ${chainId}`)

describe('Smart Accounts', () => {
	describe('static methods', () => {
		it('should implement accountId', () => {
			expect(KernelV3Account.accountId()).toBe('kernel.advanced.v0.3.1')
			// TODO: check MyAccount
		})
		it('should implement getNewAddress', async () => {
			// const newAddress = await KernelV3Account.getNewAddress(client, {
			// 	salt: hexlify(randomBytes(32)),
			// 	validatorAddress: ECDSA_VALIDATOR,
			// 	owner: signer.address,
			// })
			// expect(newAddress).not.toBe(ZeroAddress)
		})
	})
})
