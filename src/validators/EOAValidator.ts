import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { ERC7579Validator, type SignatureData } from '@/core'
import type { UserOperation } from 'ethers-erc4337'
import { type Signer } from 'ethers'

type EOAValidatorModuleOptions = {
	address: string
	signer: Signer
}

export class EOAValidator extends ERC7579Validator {
	private readonly _options: EOAValidatorModuleOptions

	constructor(options: EOAValidatorModuleOptions) {
		super()
		this._options = options
	}

	address() {
		return this._options.address
	}

	getDummySignature(userOp: UserOperation) {
		return DUMMY_ECDSA_SIGNATURE
	}

	async getSignature(signatureData: SignatureData) {
		switch (signatureData.entryPointVersion) {
			case 'v0.7':
				return await this._options.signer.signMessage(signatureData.hash)
			case 'v0.8':
				return await this._options.signer.signTypedData(
					signatureData.domain,
					signatureData.types,
					signatureData.values,
				)
		}
	}

	static getInitData(address: string): string {
		return address
	}

	static getDeInitData(): string {
		return '0x'
	}
}
