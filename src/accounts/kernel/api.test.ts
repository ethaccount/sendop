import { IERC1271__factory } from '@/contract-types'
import { isBytes, toBytes32 } from '@/utils'
import { getECDSAValidator } from '@/validations'
import { getBytes, isAddress, JsonRpcProvider, keccak256, toUtf8Bytes, Wallet } from 'ethers'
import { alchemy } from 'evm-providers'
import { describe, expect, it } from 'vitest'
import { KernelAPI } from './api'

if (!process.env.ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

if (!process.env.DEV_7702_PK) {
	throw new Error('DEV_7702_PK is not set')
}

const CHAIN_ID = 84532
const existingAccountAddress = '0xbB2b3c6289DB836Ff1771a529eE4622C2CA5B030'

const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const owner = new Wallet(process.env.DEV_7702_PK)

describe('Test deployed Kernel on base sepolia', () => {
	const client = new JsonRpcProvider(alchemyUrl)

	const ecdsaValidator = getECDSAValidator({ ownerAddress: owner.address })

	it('#getDeployment', async () => {
		const { factory, factoryData, accountAddress } = await KernelAPI.getDeployment({
			client,
			validatorAddress: ecdsaValidator.address,
			validatorData: ecdsaValidator.initData,
			salt: toBytes32(1n),
		})

		expect(accountAddress).toBe(existingAccountAddress)
		expect(isAddress(factory)).toBe(true)
		expect(isBytes(factoryData)).toBe(true)
	})

	it('#sign1271', async () => {
		const hash = keccak256(toUtf8Bytes('Hello, world!'))
		const signature = await KernelAPI.sign1271({
			version: '0.3.3',
			validator: ecdsaValidator.address,
			hash: getBytes(hash),
			chainId: CHAIN_ID,
			accountAddress: existingAccountAddress,
			signHash: async (hash: Uint8Array) => {
				return owner.signMessage(hash)
			},
		})
		const contract = IERC1271__factory.connect(existingAccountAddress, client)
		try {
			const result = await contract.isValidSignature(hash, signature)
			expect(result).toBe('0x1626ba7e')
		} catch (e) {
			if (e instanceof Error && e.message.includes('could not decode result data')) {
				throw new Error('Account may not be deployed')
			}
		}
	})
})
