import { KernelValidationMode, KernelValidationType } from '@/accounts'
import { zeroBytes } from '@/utils'
import { concat } from 'ethers'

export interface NonceConfig {
	mode?: KernelValidationMode // 1 byte
	type?: KernelValidationType // 1 byte
	identifier?: string // 20 bytes
	key?: string // 2 bytes
}

export function getNonceKey(validatorAddress: string, nonceConfig?: NonceConfig) {
	const defaultOptions = {
		mode: KernelValidationMode.DEFAULT,
		type: KernelValidationType.ROOT,
		identifier: validatorAddress,
		key: zeroBytes(2),
	}
	const { mode, type, identifier, key } = { ...defaultOptions, ...nonceConfig }
	return BigInt(concat([mode, type, identifier, key]))
}
