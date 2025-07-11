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
const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const owner = new Wallet(process.env.DEV_7702_PK)

describe('Test deployed Kernel on base sepolia', () => {
	const client = new JsonRpcProvider(alchemyUrl)
	const SALT = toBytes32(2n)
	const ACCOUNT_ADDRESS = '0x5260CC89F8Ab5745b391c1bafcf914A13A0370e2'

	const ecdsaValidator = getECDSAValidator({ ownerAddress: owner.address })

	it('#getDeployment', async () => {
		const { factory, factoryData, accountAddress } = await KernelAPI.getDeployment({
			client,
			validatorAddress: ecdsaValidator.address,
			validatorData: ecdsaValidator.initData,
			salt: SALT,
		})

		expect(accountAddress).toBe(ACCOUNT_ADDRESS)
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
			accountAddress: ACCOUNT_ADDRESS,
			signHash: async (hash: Uint8Array) => {
				return owner.signMessage(hash)
			},
		})
		const contract = IERC1271__factory.connect(ACCOUNT_ADDRESS, client)
		const result = await contract.isValidSignature(hash, signature)
		expect(result).toBe('0x1626ba7e')
	})
})
