import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { BaseValidatorModule, type ValidatorModule } from './types'
import type { Module } from '@/erc7579'

export function getECDSAValidator({ ownerAddress }: { ownerAddress: string }): Module {
	return {
		address: ADDRESS.ECDSAValidator,
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		initData: ownerAddress,
		deInitData: '0x',
	}
}

export class ECDSAValidator extends BaseValidatorModule implements ValidatorModule {
	constructor(module: Module) {
		super(module)
	}

	get validatorAddress() {
		return this.address
	}

	getDummySignature(): Promise<string> {
		return Promise.resolve(DUMMY_ECDSA_SIGNATURE)
	}

	formatSignature(sig: string): Promise<string> {
		return Promise.resolve(sig)
	}
}
