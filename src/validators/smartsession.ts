import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import type { SessionStruct } from '@/contract-types/TSmartSession'
import { ERC7579Validator, type SignatureData } from '@/core'
import type { Signer } from 'ethers'
import { concat, keccak256 } from 'ethers'
import { abiEncode, concatBytesList } from '../utils/ethers-helper'

export const SMART_SESSIONS_USE_MODE = '0x00'
export const SMART_SESSIONS_ENABLE_MODE = '0x01'
export const SMART_SESSIONS_UNSAFE_ENABLE_MODE = '0x02'

export type SmartSessionsMode =
	| typeof SMART_SESSIONS_USE_MODE
	| typeof SMART_SESSIONS_ENABLE_MODE
	| typeof SMART_SESSIONS_UNSAFE_ENABLE_MODE

export function isEnableMode(mode: SmartSessionsMode) {
	return mode === SMART_SESSIONS_ENABLE_MODE || mode === SMART_SESSIONS_UNSAFE_ENABLE_MODE
}

export function getPermissionId(session: SessionStruct) {
	return keccak256(
		abiEncode(
			['address', 'bytes', 'bytes32'],
			[session.sessionValidator, session.sessionValidatorInitData, session.salt],
		),
	)
}

export function getSmartSessionUseModeSignature(permissionId: string, signature: string) {
	return concat([SMART_SESSIONS_USE_MODE, permissionId, signature])
}

export type OwnableSmartSessionValidatorOptions = {
	permissionId: string
	signer: Signer
}

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
