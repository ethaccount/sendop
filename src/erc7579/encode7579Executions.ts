import { INTERFACES } from '@/interfaces'
import { encodeExecutions } from '@/sendop'
import type { Execution } from '@/types'
import { isBytes, toBytes32, zeroBytes } from '@/utils'
import { concat } from 'ethers'
import { CallType, ExecType, ModeSelector, type ERC7579ExecModeConfig } from './types'

export function encode7579Executions(executions: Execution[], execModeConfig?: ERC7579ExecModeConfig) {
	if (!executions.length) {
		return '0x'
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
		...execModeConfig,
	}

	if (executions.length === 1) {
		callType = CallType.SIGNLE
	}

	if (!isBytes(callType, 1)) throw new Error(`invalid callType ${callType}`)
	if (!isBytes(execType, 1)) throw new Error(`invalid execType ${execType}`)
	if (!isBytes(unused, 4)) throw new Error(`invalid unused ${unused}`)
	if (!isBytes(modeSelector, 4)) throw new Error(`invalid modeSelector ${modeSelector}`)
	if (!isBytes(modePayload, 22)) throw new Error(`invalid modePayload ${modePayload}`)

	const execMode = concat([callType, execType, unused, modeSelector, modePayload])

	switch (callType) {
		case CallType.SIGNLE:
			return INTERFACES.IERC7579Account.encodeFunctionData('execute', [
				execMode,
				concat([executions[0].to, toBytes32(executions[0].value), executions[0].data]),
			])
		case CallType.BATCH:
			return INTERFACES.IERC7579Account.encodeFunctionData('execute', [execMode, encodeExecutions(executions)])
		default:
			throw new Error('unsupported call type')
	}
}
