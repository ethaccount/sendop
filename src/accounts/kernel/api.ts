import { randomBytes32 } from '@/utils'
import type { BigNumberish } from 'ethers'
import { JsonRpcProvider } from 'ethers'
import { encodeInstallModule } from './api/encodeInstallModule'
import { encodeUninstallModule } from './api/encodeUninstallModule'
import { getDeployment } from './api/getDeployment'
import { getNonceKey } from './api/getNonceKey'
import { sign1271 } from './api/sign1271'
import type { KernelInstallModuleConfig, KernelUninstallModuleConfig } from './types'

export class Kernel {
	static async getDeployment({
		client,
		validatorAddress,
		validatorData,
		salt = randomBytes32(),
	}: {
		client: JsonRpcProvider
		validatorAddress: string
		validatorData: string
		salt?: string
	}) {
		const { factory, factoryData, accountAddress } = await getDeployment({
			client,
			validatorAddress,
			validatorData,
			salt,
		})
		return { factory, factoryData, accountAddress }
	}

	static getNonceKey(validatorAddress: string) {
		return getNonceKey(validatorAddress)
	}

	static async sign1271({
		hash,
		version = '0.3.3',
		validator,
		chainId,
		accountAddress,
		signHash,
	}: {
		hash: Uint8Array
		version: '0.3.3' | '0.3.1'
		validator: string
		chainId: BigNumberish
		accountAddress: string
		signHash: (hash: Uint8Array) => Promise<string>
	}) {
		return await sign1271({ version, validator, hash, chainId, accountAddress, signHash })
	}

	static encodeInstallModule(config: KernelInstallModuleConfig): string {
		return encodeInstallModule(config)
	}

	static encodeUninstallModule(config: KernelUninstallModuleConfig): string {
		return encodeUninstallModule(config)
	}
}
