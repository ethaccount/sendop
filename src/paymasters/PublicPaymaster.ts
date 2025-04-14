import type { GetPaymasterStubDataResult, PaymasterGetter, UserOp } from '@/core'

export class PublicPaymaster implements PaymasterGetter {
	public address: string

	constructor(address: string) {
		this.address = address
	}

	async getPaymasterStubData(_userOp: UserOp): Promise<GetPaymasterStubDataResult> {
		return {
			paymaster: this.address,
			paymasterData: '0x',
			paymasterVerificationGasLimit: 8000n,
			paymasterPostOpGasLimit: 0n,
			isFinal: true,
		}
	}
}
