import { CallType, encodeExecutions, ExecType, ModeSelector, type Execution } from '@/core'
import { INTERFACES } from '@/interfaces'
import { isBytes, toBytes32, zeroBytes } from '@/utils'
import { concat } from 'ethers'

export async function encodeERC7579Execution(executions: Execution[]) {
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
