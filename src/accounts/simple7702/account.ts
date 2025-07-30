import { EntryPointV08__factory } from '@/contract-types'
import { ENTRY_POINT_V08_ADDRESS } from '@/constants'
import { INTERFACES } from '@/interfaces'
import { type AccountAPI, type Execution } from '@/types'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import type { JsonRpcProvider } from 'ethers'

export class Simple7702AccountAPI extends SingleEOAValidation implements AccountAPI {
	id = 'infinitism.Simple7702Account.0.8.0'
	entryPointAddress = ENTRY_POINT_V08_ADDRESS

	private nonceKey: bigint

	constructor(nonceKey?: bigint) {
		super()
		this.nonceKey = nonceKey ?? 0n
	}

	async getNonce(client: JsonRpcProvider, address: string) {
		return await EntryPointV08__factory.connect(ENTRY_POINT_V08_ADDRESS, client).getNonce(address, this.nonceKey)
	}

	async getCallData(executions: Execution[]): Promise<string> {
		if (!executions.length) {
			return '0x'
		}

		if (executions.length === 1) {
			const execution = executions[0]
			return INTERFACES.Simple7702AccountV08.encodeFunctionData('execute', [
				execution.to,
				execution.value,
				execution.data,
			])
		}

		return INTERFACES.Simple7702AccountV08.encodeFunctionData('executeBatch', [
			executions.map(execution => ({
				target: execution.to,
				value: execution.value,
				data: execution.data,
			})),
		])
	}
}
