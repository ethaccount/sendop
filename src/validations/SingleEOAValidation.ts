import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { type ValidationAPI } from '@/types'

export class SingleEOAValidation implements ValidationAPI {
	async getDummySignature(): Promise<string> {
		return Promise.resolve(DUMMY_ECDSA_SIGNATURE)
	}

	async formatSignature(sig: string): Promise<string> {
		return Promise.resolve(sig)
	}

	async format1271Signature(sig: string): Promise<string> {
		return Promise.resolve(sig)
	}
}
