export class OwnableSmartSessionValidator extends ERC7579Validator {
	private readonly _options: OwnableSmartSessionValidatorOptions
	constructor(options: OwnableSmartSessionValidatorOptions) {
		super()
		this._options = options
	}
	address = () => ADDRESS.SmartSession
	getDummySignature = () => {
		const threshold = 1
		return getSmartSessionUseModeSignature(
			this._options.permissionId,
			concatBytesList(Array(threshold).fill(DUMMY_ECDSA_SIGNATURE)),
		)
	}
	getSignature = async (signatureData: SignatureData) => {
		const threshold = 1

		let signature: string
		switch (signatureData.entryPointVersion) {
			case 'v0.7':
				signature = await this._options.signer.signMessage(signatureData.hash)
				break
			case 'v0.8':
				signature = await this._options.signer.signTypedData(
					signatureData.domain,
					signatureData.types,
					signatureData.values,
				)
				break
		}

		return getSmartSessionUseModeSignature(
			this._options.permissionId,
			concatBytesList(Array(threshold).fill(signature)),
		)
	}
}
