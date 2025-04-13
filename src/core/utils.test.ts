import { describe, expect, it } from 'vitest'
import { getEmptyUserOp, getUserOpHashV08, packUserOp } from './utils'
import { JsonRpcProvider } from 'ethers'
import { connectEntryPointV08 } from '@/utils'

describe('core utils', () => {
	describe('getUserOpHashV08', () => {
		it('should generate correct hash for a packed user operation', async () => {
			const userOp = getEmptyUserOp()
			userOp.sender = '0x1234567890123456789012345678901234567890'
			userOp.nonce = 1n
			userOp.factory = '0x2234567890123456789012345678901234567890'
			userOp.factoryData = '0x1234'
			userOp.callData = '0x5678'
			userOp.callGasLimit = BigInt(1000)
			userOp.verificationGasLimit = BigInt(2000)
			userOp.preVerificationGas = BigInt(3000)
			userOp.maxFeePerGas = BigInt(4000)
			userOp.maxPriorityFeePerGas = BigInt(5000)
			userOp.paymaster = '0x3234567890123456789012345678901234567890'
			userOp.paymasterVerificationGasLimit = BigInt(6000)
			userOp.paymasterPostOpGasLimit = BigInt(7000)
			userOp.paymasterData = '0x9abc'

			const packedOp = packUserOp(userOp)
			const chainId = 11155111n
			const provider = new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
			const entryPoint = connectEntryPointV08(provider)
			const expected = await entryPoint.getUserOpHash(packedOp)
			const hash = getUserOpHashV08(packedOp, chainId)
			expect(hash).toBe(expected)
		})
	})
})
