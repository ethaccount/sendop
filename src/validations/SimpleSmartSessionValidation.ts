import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import type { ValidationAPI } from '@/types'
import { concatBytesList } from '@/utils'
import { getSmartSessionUseModeSignature } from '@/validators/smartsession'

export class SimpleSmartSessionValidation implements ValidationAPI {
	validatorAddress = ADDRESS.SmartSession

	private permissionId: string
	private threshold: number

	constructor({ permissionId, threshold }: { permissionId: string; threshold: number }) {
		this.permissionId = permissionId
		this.threshold = threshold
	}

	async getDummySignature() {
		return getSmartSessionUseModeSignature(
			this.permissionId,
			concatBytesList(Array(this.threshold).fill(DUMMY_ECDSA_SIGNATURE)),
		)
	}

	async formatSignature(sig: string) {
		return getSmartSessionUseModeSignature(this.permissionId, sig)
	}
}
