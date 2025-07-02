import type { AccountValidation } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { concatBytesList } from '@/utils'
import { getSmartSessionUseModeSignature } from '@/validators/smartsession'

export class SmartSessionValidation implements AccountValidation {
	private permissionId: string
	private threshold: number

	constructor({ permissionId, threshold }: { permissionId: string; threshold: number }) {
		this.permissionId = permissionId
		this.threshold = threshold
	}

	get validatorAddress() {
		return ADDRESS.SmartSession
	}

	async getDummySignature() {
		return getSmartSessionUseModeSignature(
			this.permissionId,
			concatBytesList(Array(this.threshold).fill(DUMMY_ECDSA_SIGNATURE)),
		)
	}

	async formatSignature(sig: string) {
		return getSmartSessionUseModeSignature(this.permissionId, concatBytesList(Array(this.threshold).fill(sig)))
	}
}
