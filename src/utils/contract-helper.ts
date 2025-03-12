import ADDRESS from '@/addresses'
import { EntryPointV7__factory } from '@/contract-types'
import type { UserOp } from '@/core'
import { packUserOp } from '@/core'

import type { ContractRunner } from 'ethers'

export function connectEntryPointV07(runner: ContractRunner) {
	return EntryPointV7__factory.connect(ADDRESS.EntryPointV7, runner)
}

export function encodeHandleOpsCalldata(userOps: UserOp[], beneficiary: string) {
	return EntryPointV7__factory.createInterface().encodeFunctionData('handleOps', [
		userOps.map(op => packUserOp(op)),
		beneficiary,
	])
}
