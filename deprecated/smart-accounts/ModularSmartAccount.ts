import type { BaseModuleConfig, ERC7579_MODULE_TYPE } from '@/erc7579'
import { CallType, ExecType, ModeSelector } from '@/erc7579'
import { SendopError } from '@/error'
import { INTERFACES } from '@/interfaces'
import type { ERC7579Validator, SignatureData } from '@/sendop'
import { encodeExecutions } from '@/sendop'
import type { Execution } from '@/types'
import { isBytes, toBytes32, zeroBytes } from '@/utils'
import { concat } from 'ethers'
import type { UserOperation } from 'ethers-erc4337'
import { SmartAccount, type SmartAccountCreationOptions, type SmartAccountOptions } from './SmartAccount'

export type ModularSmartAccountOptions = SmartAccountOptions & {
	validator: ERC7579Validator
	execMode?: {
		callType?: CallType // 1 byte
		execType?: ExecType // 1 byte
		unused?: string // 4 bytes
		modeSelector?: ModeSelector // 4 bytes
		modePayload?: string // 22 bytes
	}
}

export abstract class ModularSmartAccount<
	TCreationOptions extends SmartAccountCreationOptions,
> extends SmartAccount<TCreationOptions> {
	protected readonly _options: ModularSmartAccountOptions

	constructor(options: ModularSmartAccountOptions) {
		super(options)
		this._options = options
	}

	get validator(): ERC7579Validator {
		return this._options.validator
	}

	async getDummySignature(userOp: UserOperation): Promise<string> {
		return this.validator.getDummySignature(userOp)
	}

	async getSignature(signatureData: SignatureData): Promise<string> {
		return this.validator.getSignature(signatureData)
	}

	getCallData(executions: Execution[]): Promise<string> | string {
		if (!executions.length) {
			return '0x'
		}

		if (executions.length === 1 && executions[0].to == this.address) {
			return executions[0].data
		}

		const defaultExecutionMode = {
			callType: CallType.BATCH,
			execType: ExecType.DEFAULT,
			unused: zeroBytes(4),
			modeSelector: ModeSelector.DEFAULT,
			modePayload: zeroBytes(22),
		}

		let { callType, execType, modeSelector, modePayload, unused } = {
			...defaultExecutionMode,
			...this._options.execMode,
		}

		if (executions.length === 1) {
			callType = CallType.SIGNLE
		}

		if (!isBytes(callType, 1)) throw this.createError(`invalid callType ${callType}`)
		if (!isBytes(execType, 1)) throw this.createError(`invalid execType ${execType}`)
		if (!isBytes(unused, 4)) throw this.createError(`invalid unused ${unused}`)
		if (!isBytes(modeSelector, 4)) throw this.createError(`invalid modeSelector ${modeSelector}`)
		if (!isBytes(modePayload, 22)) throw this.createError(`invalid modePayload ${modePayload}`)

		const execMode = concat([callType, execType, unused, modeSelector, modePayload])

		switch (callType) {
			case CallType.SIGNLE:
				return INTERFACES.IERC7579Account.encodeFunctionData('execute', [
					execMode,
					concat([executions[0].to, toBytes32(executions[0].value), executions[0].data]),
				])
			case CallType.BATCH:
				return INTERFACES.IERC7579Account.encodeFunctionData('execute', [
					execMode,
					encodeExecutions(executions),
				])
			default:
				throw this.createError('unsupported call type')
		}
	}

	static encodeInstallModule(config: BaseModuleConfig<ERC7579_MODULE_TYPE>): string {
		throw new SendopError('ModularSmartAccount.encodeInstallModule is not implemented')
	}

	static encodeUninstallModule(config: BaseModuleConfig<ERC7579_MODULE_TYPE>): string {
		throw new SendopError('ModularSmartAccount.encodeUninstallModule is not implemented')
	}
}
