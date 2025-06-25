import { SendopError } from '@/error'
import { abiEncode, getBytesLength, isBytes } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { dataSlice, getAddress, isAddress } from 'ethers'
import type { Execution } from './types'

export function encodeExecution(execution: Execution) {
	assertExecution(execution)
	return abiEncode(['address', 'uint256', 'bytes'], [execution.to, execution.value, execution.data])
}

export function encodeExecutions(executions: Execution[]) {
	assertExecutions(executions)
	return abiEncode(
		['tuple(address,uint256,bytes)[]'],
		[executions.map(execution => [execution.to, execution.value, execution.data])],
	)
}

export function assertExecution(execution: Execution) {
	if (!isBytes(execution.data)) {
		throw new SendopError(`Invalid execution data (${execution.data})`)
	}
	if (!isAddress(execution.to)) {
		throw new SendopError(`Invalid execution to (${execution.to})`)
	}
}

export function assertExecutions(executions: Execution[]) {
	for (const execution of executions) {
		assertExecution(execution)
	}
}

export async function isSmartEOA(client: JsonRpcProvider, address: string) {
	const code = await client.getCode(address)
	if (code.startsWith('0xef0100') && isAddress(dataSlice(code, 3, 23)) && getBytesLength(code) === 23) {
		return true
	}
	return false
}

export async function getSmartEOADelegateAddress(client: JsonRpcProvider, address: string): Promise<string | null> {
	const code = await client.getCode(address)
	if (code.startsWith('0xef0100') && isAddress(dataSlice(code, 3, 23)) && getBytesLength(code) === 23) {
		return getAddress(dataSlice(code, 3, 23))
	}
	return null
}
