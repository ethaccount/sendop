import type { AccountValidation } from '@/accounts/types'
import type { ERC7579_MODULE_TYPE } from '@/erc7579'

export interface Module {
	address: string
	initData: string
	deInitData: string
	type: ERC7579_MODULE_TYPE
	additionalContext?: string
}

export interface ValidatorModule extends AccountValidation, Module {}

export class BaseValidatorModule implements Module {
	private module: Module

	constructor(module: Module) {
		this.module = module
	}

	get address() {
		return this.module.address
	}
	get initData() {
		return this.module.initData
	}
	get deInitData() {
		return this.module.deInitData
	}
	get type() {
		return this.module.type
	}
	get additionalContext() {
		return this.module.additionalContext
	}
}
