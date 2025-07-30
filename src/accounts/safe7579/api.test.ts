import { ADDRESS } from '@/addresses'
import { BICONOMY_ATTESTER_ADDRESS, ERC1271_MAGICVALUE, RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { IERC1271__factory } from '@/contract-types'
import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { toBytes32 } from '@/utils'
import { getOwnableValidator } from '@rhinestone/module-sdk'
import { getBytes, JsonRpcProvider, keccak256, toUtf8Bytes, Wallet } from 'ethers'
import { alchemy } from 'evm-providers'
import { describe, expect, it } from 'vitest'
import { Safe7579API } from './api'

if (!process.env.ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

if (!process.env.DEV_7702_PK) {
	throw new Error('DEV_7702_PK is not set')
}

const CHAIN_ID = 84532
const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const signer = new Wallet(process.env.DEV_7702_PK)
const client = new JsonRpcProvider(alchemyUrl)
const existingSafe7579Address = '0xF7FD25f6b36331467Af20A14bBE3166FaA1E7Fa1'

describe('Safe7579 API', () => {
	const ownableValidator = getOwnableValidator({
		owners: [signer.address as `0x${string}`],
		threshold: 1,
	})

	it('#getDeployment', async () => {
		const deployment = await Safe7579API.getDeployment({
			client,
			creationOptions: {
				validatorAddress: ownableValidator.address,
				validatorInitData: ownableValidator.initData,
				owners: [signer.address],
				ownersThreshold: 1,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				attestersThreshold: 1,
			},
			salt: toBytes32(1n),
		})

		expect(deployment.factory).toBe(Safe7579API.factoryAddress)
		expect(deployment.factoryData).toMatch(/^0x[a-fA-F0-9]+$/)
		expect(deployment.accountAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
	})

	it('#encodeInstallModule', () => {
		const encoded = Safe7579API.encodeInstallModule({
			moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
			moduleAddress: ADDRESS.WebAuthnValidator,
			initData: '0x1234',
		})
		expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
	})

	it('#encodeUninstallModule', () => {
		const encoded = Safe7579API.encodeUninstallModule({
			moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
			moduleAddress: ADDRESS.WebAuthnValidator,
			deInitData: '0x1234',
			prev: ADDRESS.OwnableValidator,
		})
		expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
	})

	it('#sign1271', async () => {
		const hash = keccak256(toUtf8Bytes('Hello, world!'))
		const signature = await Safe7579API.sign1271({
			validatorAddress: ownableValidator.address,
			hash: getBytes(hash),
			signHash: async (hash: Uint8Array) => {
				return signer.signMessage(hash)
			},
		})
		const contract = IERC1271__factory.connect(existingSafe7579Address, client)
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
