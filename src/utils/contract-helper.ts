import ADDRESS from '@/addresses'
import { EntryPointV7__factory } from '@/contract-types'
import type { UserOp } from '@/core'
import { packUserOp } from '@/core'
import INTERFACES from '@/interfaces'
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

export function parseContractError(revert: string): string {
	if (!revert) return ''

	for (const [name, iface] of Object.entries(INTERFACES)) {
		try {
			const decodedError = iface.parseError(revert)
			if (decodedError) {
				const errorArgs = decodedError.args.length > 0 ? `(${decodedError.args.join(', ')})` : ''
				return `${name}.${decodedError.name}${errorArgs}`
			}
		} catch {
			// Continue to next interface if parsing fails
			continue
		}
	}

	return ''
}
