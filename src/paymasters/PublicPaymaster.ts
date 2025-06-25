import type { GetPaymasterStubDataResult, PaymasterGetter, UserOperation } from '@/core'

export class PublicPaymaster implements PaymasterGetter {
	public address: string

	constructor(address: string) {
		this.address = address
	}

	async getPaymasterStubData(_userOp: UserOperation): Promise<GetPaymasterStubDataResult> {
		return {
			paymaster: this.address,
			paymasterData: '0x',
			paymasterVerificationGasLimit: 11_000n, // How to estimate this value? I only use this gas limit or higher during testing to prevent user op from pending
			paymasterPostOpGasLimit: 0n,
			isFinal: true,
		}
	}
}
