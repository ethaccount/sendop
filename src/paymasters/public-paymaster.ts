import { ADDRESS } from '@/addresses'
import type { PaymasterAPI } from '@/types'

export const PublicPaymaster: PaymasterAPI = {
	getPaymaster: async () => ADDRESS.PublicPaymaster,
	getPaymasterData: async () => '0x',
	getPaymasterPostOpGasLimit: async () => 0n,
}

export function getPublicPaymaster() {
	return {
		paymaster: ADDRESS.PublicPaymaster,
		paymasterData: '0x',
		paymasterPostOpGasLimit: 0n,
	}
}
