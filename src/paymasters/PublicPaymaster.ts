import type { GetPaymasterStubDataResult, PaymasterGetter, UserOp } from '@/core'
import { toBeHex } from 'ethers'

export class PublicPaymaster implements PaymasterGetter {
	public address: string

	constructor(address: string) {
		this.address = address
	}

	async getPaymasterStubData(_userOp: UserOp): Promise<GetPaymasterStubDataResult> {
		return {
			paymaster: this.address,
			paymasterData: '0x',
			paymasterVerificationGasLimit: 999_999n,
			paymasterPostOpGasLimit: 999_999n,
			isFinal: true,
		}
	}
}
