import { KernelValidationMode, KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { zeroBytes } from '@/utils'
import { concat } from 'ethers'

export function getNonceKey(validatorAddress: string) {
	const defaultOptions = {
		mode: KernelValidationMode.DEFAULT,
		type: KernelValidationType.ROOT,
		identifier: validatorAddress,
		key: zeroBytes(2),
	}
	const { mode, type, identifier, key } = defaultOptions
	return BigInt(concat([mode, type, identifier, key]))
}
