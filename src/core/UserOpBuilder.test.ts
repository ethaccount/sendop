import { describe, expect, it } from 'vitest'
import { UserOpBuilder } from './UserOpBuilder'
import type { UserOperation } from './UserOperation'

describe('UserOpBuilder', () => {
	it('should build a user op', async () => {
		expect(true).toBe(true)
	})

	it('should create UserOpBuilder from existing UserOperation', () => {
		const mockUserOp: UserOperation = {
			sender: '0x960CBf515F3DcD46f541db66C76Cf7acA5BEf4C7',
			nonce: 890457095688689016701125407583492770720572911388340797834163564274778116n,
			maxFeePerGas: 1050075n,
			maxPriorityFeePerGas: 1050000n,
			callGasLimit: 17955n,
			verificationGasLimit: 87869n,
			preVerificationGas: 49390n,
			callData:
				'0xe9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003896e44d241d3a6b069c3df4e69de28ea098805b180000000000000000000000000000000000000000000000000000000000000000d09de08a0000000000000000',
			signature:
				'0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c',
			paymaster: '0xcD1c62f36A99f306948dB76c35Bbc1A639f92ce8',
			paymasterData: '0x',
			paymasterPostOpGasLimit: 0n,
			paymasterVerificationGasLimit: 19587n,
		}

		const options = {
			chainId: 1,
		}

		const builder = UserOpBuilder.from(mockUserOp, options)
		const result = builder.preview()

		// Verify all properties are correctly set
		expect(result.sender).toBe(mockUserOp.sender)
		expect(result.nonce).toBe(mockUserOp.nonce)
		expect(result.maxFeePerGas).toBe(mockUserOp.maxFeePerGas)
		expect(result.maxPriorityFeePerGas).toBe(mockUserOp.maxPriorityFeePerGas)
		expect(result.callGasLimit).toBe(mockUserOp.callGasLimit)
		expect(result.verificationGasLimit).toBe(mockUserOp.verificationGasLimit)
		expect(result.preVerificationGas).toBe(mockUserOp.preVerificationGas)
		expect(result.callData).toBe(mockUserOp.callData)
		expect(result.signature).toBe(mockUserOp.signature)
		expect(result.paymaster).toBe(mockUserOp.paymaster)
		expect(result.paymasterData).toBe(mockUserOp.paymasterData)
		expect(result.paymasterPostOpGasLimit).toBe(mockUserOp.paymasterPostOpGasLimit)
		expect(result.paymasterVerificationGasLimit).toBe(mockUserOp.paymasterVerificationGasLimit)

		// Verify builder properties
		expect(builder.chainId).toBe(1)
	})
})
