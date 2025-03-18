import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { ERC7579Validator, type UserOp } from '@/core'
import type { BytesLike } from 'ethers'
import { type Signer } from 'ethers'

type EOAValidatorModuleOptions = {
	address: string
	signer: Signer
}

export class EOAValidatorModule extends ERC7579Validator {
	private readonly _options: EOAValidatorModuleOptions

	constructor(options: EOAValidatorModuleOptions) {
		super()
		this._options = options
	}

	address() {
		return this._options.address
	}

	getDummySignature(userOp: UserOp) {
		return DUMMY_ECDSA_SIGNATURE
	}

	async getSignature(userOpHash: Uint8Array, userOp: UserOp) {
		return await this._options.signer.signMessage(userOpHash)
	}

	static getInitData(address: string): string {
		return address
	}

	static getDeInitData(): string {
		return '0x'
	}
}
