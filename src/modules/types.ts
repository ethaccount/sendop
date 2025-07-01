import type { ERC7579_MODULE_TYPE } from '@/core'
import type { ValidationAPI } from '@/accounts/types'

export interface Module {
	address: string
	initData: string
	deInitData: string
	type: ERC7579_MODULE_TYPE
	additionalContext?: string
}

export interface Validator extends ValidationAPI, Module {}

export class BaseValidator implements Module {
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
