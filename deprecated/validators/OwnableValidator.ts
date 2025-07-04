import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { ERC7579Validator, type SignatureData } from '@/sendop'
import type { UserOperation } from 'ethers-erc4337'
import { abiEncode } from '@/utils'
import { concat, type Signer } from 'ethers'

type OwnableValidatorOptions = {
	signers: Signer[]
}

export class OwnableValidator extends ERC7579Validator {
	private readonly _options: OwnableValidatorOptions

	constructor(options: OwnableValidatorOptions) {
		super()
		this._options = options
	}

	address() {
		return ADDRESS.OwnableValidator
	}

	getDummySignature(_userOp: UserOperation) {
		return concat(new Array(this._options.signers.length).fill(DUMMY_ECDSA_SIGNATURE))
	}

	async getSignature(signatureData: SignatureData) {
		let signature = ''
		for (const signer of this._options.signers) {
			switch (signatureData.entryPointVersion) {
				case 'v0.7':
					signature = signature + (await signer.signMessage(signatureData.hash))
					break
				case 'v0.8':
					signature =
						signature +
						(await signer.signTypedData(signatureData.domain, signatureData.types, signatureData.values))
			}
		}
		return signature
	}

	static getInitData(signers: string[], threshold: number): string {
		return abiEncode(['uint256', 'address[]'], [threshold, signers])
	}

	static getDeInitData(): string {
		return '0x'
	}
}
