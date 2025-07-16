import { ADDRESS } from '@/addresses'
import { BICONOMY_ATTESTER_ADDRESS, RHINESTONE_ATTESTER_ADDRESS } from '@/constants'
import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { getOwnableValidator } from '@rhinestone/module-sdk'
import { JsonRpcProvider, Wallet } from 'ethers'
import { alchemy } from 'evm-providers'
import { describe, expect, it } from 'vitest'
import { NexusAPI } from './api'

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

describe('Nexus API', () => {
	const ownableValidator = getOwnableValidator({
		owners: [signer.address as `0x${string}`],
		threshold: 1,
	})

	it('#getDeployment', async () => {
		const deployment = await NexusAPI.getDeployment({
			client,
			creationOptions: {
				bootstrap: 'initNexusWithSingleValidator',
				validatorAddress: ownableValidator.address,
				validatorInitData: ownableValidator.initData,
				registryAddress: ADDRESS.Registry,
				attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
				threshold: 1,
			},
		})

		expect(deployment.factory).toBe(NexusAPI.factoryAddress)
		expect(deployment.factoryData).toMatch(/^0x[a-fA-F0-9]+$/)
		expect(deployment.accountAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
	})

	it('#encodeInstallModule', () => {
		const encoded = NexusAPI.encodeInstallModule({
			moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
			moduleAddress: ADDRESS.WebAuthnValidator,
			initData: '0x1234',
		})
		expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
	})

	it('#encodeUninstallModule', () => {
		const encoded = NexusAPI.encodeUninstallModule({
			moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
			moduleAddress: ADDRESS.WebAuthnValidator,
			deInitData: '0x1234',
			prev: ADDRESS.OwnableValidator,
		})
		expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/)
	})
})
