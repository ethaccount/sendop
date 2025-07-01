import { randomBytes32 } from '@/utils'
import type { BigNumberish } from 'ethers'
import { JsonRpcProvider } from 'ethers'
import type { AccountStaticAPI } from '../types'
import { computeAddress } from './api/computeAddress'
import { getNonceKey } from './api/getNonceKey'
import { signERC1271 } from './api/signERC1271'

export const Kernel: AccountStaticAPI = {
	async computeAddress(
		client: JsonRpcProvider,
		validatorAddress: string,
		validatorData: string,
		salt: string = randomBytes32(),
	) {
		const { factory, factoryData, accountAddress } = await computeAddress(
			client,
			validatorAddress,
			validatorData,
			salt,
		)
		return { factory, factoryData, accountAddress }
	},

	getNonceKey(validatorAddress: string) {
		return getNonceKey(validatorAddress)
	},

	async signERC1271({
		version = '0.3.3',
		validator,
		hash,
		chainId,
		accountAddress,
		signHash,
	}: {
		version: '0.3.3' | '0.3.1'
		validator: string
		hash: Uint8Array
		chainId: BigNumberish
		accountAddress: string
		signHash: (hash: Uint8Array) => Promise<string>
	}) {
		return await signERC1271({ version, validator, hash, chainId, accountAddress, signHash })
	},
}
