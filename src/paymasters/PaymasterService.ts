import { toUserOpHex, type UserOperation } from '@/core'
import type { AddressLike, BigNumberish, FetchRequest, JsonRpcApiProviderOptions } from 'ethers'
import { getBigInt, JsonRpcProvider, resolveAddress, toBeHex } from 'ethers'
import type {
	GetPaymasterDataParams,
	GetPaymasterDataResult,
	GetPaymasterStubDataParams,
	GetPaymasterStubDataResult,
} from './erc7677-types'

export class PaymasterServiceError extends Error {
	constructor(message: string, cause?: unknown) {
		super(message, { cause })
		this.name = 'PaymasterServiceError'
	}
}

export class PaymasterService extends JsonRpcProvider {
	chainId: bigint

	constructor(url: string | FetchRequest, chainId: BigNumberish, options?: JsonRpcApiProviderOptions) {
		const serviceOptions = {
			...options,
			batchMaxCount: options?.batchMaxCount ? 1 : options?.batchMaxCount,
			staticNetwork: options?.staticNetwork ?? true,
		}
		super(url, chainId, serviceOptions)
		this.chainId = getBigInt(chainId)
	}

	/**
	 * Get supported entry points for this paymaster
	 * @returns Array of supported entry point addresses
	 */
	async supportedEntryPoints(): Promise<string[]> {
		return await this.send('pm_supportedEntryPoints', [])
	}

	/**
	 * Get paymaster stub data for a user operation
	 */
	async getPaymasterStubData({
		userOp,
		entryPointAddress,
		context,
	}: {
		userOp: UserOperation
		entryPointAddress: AddressLike
		context: Record<string, any>
	}): Promise<GetPaymasterStubDataResult | null> {
		let params: GetPaymasterStubDataParams
		try {
			params = [toUserOpHex(userOp), await resolveAddress(entryPointAddress), toBeHex(this.chainId), context]
		} catch (err) {
			throw new PaymasterServiceError('Error building params for pm_getPaymasterStubData', {
				cause: err,
			})
		}
		return await this.send('pm_getPaymasterStubData', params)
	}

	/**
	 * Get final paymaster data for a user operation
	 */
	async getPaymasterData({
		userOp,
		entryPointAddress,
		context,
	}: {
		userOp: UserOperation
		entryPointAddress: AddressLike
		context: Record<string, any>
	}): Promise<GetPaymasterDataResult | null> {
		let params: GetPaymasterDataParams
		try {
			params = [toUserOpHex(userOp), await resolveAddress(entryPointAddress), toBeHex(this.chainId), context]
		} catch (err) {
			throw new PaymasterServiceError('Error building params for pm_getPaymasterData', {
				cause: err,
			})
		}
		return await this.send('pm_getPaymasterData', params)
	}
}
