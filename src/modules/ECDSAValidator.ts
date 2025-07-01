import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { ERC7579_MODULE_TYPE } from '@/core'
import { BaseValidator, type Module, type Validator } from './types'

export function getECDSAValidator({ ownerAddress }: { ownerAddress: string }): Module {
	return {
		address: ADDRESS.ECDSAValidator,
		initData: ownerAddress,
		deInitData: '0x',
		type: ERC7579_MODULE_TYPE.VALIDATOR,
	}
}

export class ECDSAValidator extends BaseValidator implements Validator {
	constructor(module: Module) {
		super(module)
	}

	getDummySignature(): Promise<string> {
		return Promise.resolve(DUMMY_ECDSA_SIGNATURE)
	}

	formatSignature(sig: string): Promise<string> {
		return Promise.resolve(sig)
	}
}
