import { describe, expect, it } from 'vitest'
import { getEmptyUserOp, getUserOpHashV08, packUserOp } from './utils'
import { JsonRpcProvider } from 'ethers'
import { connectEntryPointV08 } from '@/utils'

describe('core utils', () => {
	describe('getUserOpHashV08', () => {
		it('should generate correct hash for a packed user operation', async () => {
			const userOp = getEmptyUserOp()
			userOp.sender = '0x1234567890123456789012345678901234567890'
			userOp.nonce = '0x1'
			userOp.factory = '0x2234567890123456789012345678901234567890'
			userOp.factoryData = '0x1234'
			userOp.callData = '0x5678'
			userOp.callGasLimit = '0x1000'
			userOp.verificationGasLimit = '0x2000'
			userOp.preVerificationGas = '0x3000'
			userOp.maxFeePerGas = '0x4000'
			userOp.maxPriorityFeePerGas = '0x5000'
			userOp.paymaster = '0x3234567890123456789012345678901234567890'
			userOp.paymasterVerificationGasLimit = '0x6000'
			userOp.paymasterPostOpGasLimit = '0x7000'
			userOp.paymasterData = '0x9abc'

			const packedOp = packUserOp(userOp)
			const chainId = '11155111'
			const provider = new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
			const entryPoint = connectEntryPointV08(provider)
			const expected = await entryPoint.getUserOpHash(packedOp)
			const hash = getUserOpHashV08(packedOp, chainId)
			expect(hash).toBe(expected)
		})
	})
})
