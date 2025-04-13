import type { ERC7579Validator, SignatureData, UserOp } from '@/core'
import { SmartAccount, type SmartAccountOptions } from './SmartAccount'

export type ModularSmartAccountOptions = SmartAccountOptions & {
	validator: ERC7579Validator
}

export abstract class ModularSmartAccount extends SmartAccount {
	protected readonly _options: ModularSmartAccountOptions

	constructor(options: ModularSmartAccountOptions) {
		super(options)
		this._options = options
	}

	get validator(): ERC7579Validator {
		return this._options.validator
	}

	async getDummySignature(userOp: UserOp): Promise<string> {
		return this.validator.getDummySignature(userOp)
	}

	async getSignature(signatureData: SignatureData): Promise<string> {
		return this.validator.getSignature(signatureData)
	}

	/**
	 * Encodes the calldata for installing a module
	 * @param config Module installation configuration
	 * @returns Encoded calldata for module installation
	 */
	abstract encodeInstallModule(config: any): string
}
