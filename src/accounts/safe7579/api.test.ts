import { ADDRESS } from '@/addresses'
import { BICONOMY_ATTESTER_ADDRESS, RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { OwnableValidator } from '@/validators/OwnableValidator'
import { JsonRpcProvider, Wallet } from 'ethers'
import { alchemy } from 'evm-providers'
import { describe, expect, it } from 'vitest'
import { Safe7579 } from './api'

if (!process.env.ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

if (!process.env.dev7702pk) {
	throw new Error('dev7702pk is not set')
}

const CHAIN_ID = 84532
const alchemyUrl = alchemy(CHAIN_ID, process.env.ALCHEMY_API_KEY)
const signer = new Wallet(process.env.dev7702pk)
const client = new JsonRpcProvider(alchemyUrl)

describe('Safe7579 API', () => {
	it('#getDeployment', async () => {
		const deployment = await Safe7579.getDeployment({
			client,
			creationOptions: {
				validatorAddress: ADDRESS.OwnableValidator,
				validatorInitData: OwnableValidator.getInitData([signer.address], 1),
				owners: [signer.address],
				ownersThreshold: 1,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				attestersThreshold: 1,
			},
		})

		expect(deployment.factory).toBe(ADDRESS.SafeProxyFactory)
		expect(deployment.factoryData).toMatch(/^0x[a-fA-F0-9]+$/)
		expect(deployment.accountAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
	})

	it('#encodeInstallModule', () => {
		const encoded = Safe7579.encodeInstallModule({
			moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
			moduleAddress: ADDRESS.WebAuthnValidator,
			initData: '0x1234',
		})
		expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
	})

	it('#encodeUninstallModule', () => {
		const encoded = Safe7579.encodeUninstallModule({
			moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
			moduleAddress: ADDRESS.WebAuthnValidator,
			deInitData: '0x1234',
			prev: ADDRESS.OwnableValidator,
		})
		expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
	})
})
