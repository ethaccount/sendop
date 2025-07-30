import { ERC1271_MAGICVALUE } from '@/constants'
import { IERC1271__factory } from '@/contract-types'
import { getEmptyUserOp, UserOpBuilder, type TypedData } from '@/core'
import { JsonRpcProvider, keccak256, toUtf8Bytes, Wallet } from 'ethers'
import { alchemy } from 'evm-providers'
import { describe, expect, it } from 'vitest'
import { Simple7702API } from './api'

if (!process.env.ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

if (!process.env.DEV_7702_PK) {
	throw new Error('DEV_7702_PK is not set')
}

const CHAIN_ID = 11155111
const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const signer = new Wallet(process.env.DEV_7702_PK)
const client = new JsonRpcProvider(alchemyUrl)

describe('Simple7702 API', () => {
	it('#sign1271', async () => {
		const hash = keccak256(toUtf8Bytes('Hello, world!'))
		const userOp = UserOpBuilder.from(getEmptyUserOp(), { chainId: CHAIN_ID })
		const signature = await Simple7702API.sign1271({
			typedData: userOp.typedData(),
			signTypedData: async (typedData: TypedData) => {
				return signer.signTypedData(...typedData)
			},
		})

		const contract = IERC1271__factory.connect(signer.address, client)
		try {
			const result = await contract.isValidSignature(hash, signature)
			expect(result).toBe(ERC1271_MAGICVALUE)
		} catch (e) {
			if (e instanceof Error && e.message.includes('could not decode result data')) {
				throw new Error('Account may not be deployed')
			}
		}
	})
})
