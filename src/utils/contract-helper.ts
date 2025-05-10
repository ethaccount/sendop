import { ADDRESS } from '@/addresses'
import { TEntryPointV07__factory, TEntryPointV08__factory, TRegistry__factory } from '@/contract-types'
import type { UserOp } from '@/core'
import { packUserOp } from '@/core'
import { INTERFACES } from '@/interfaces'
import type { ContractRunner } from 'ethers'

export type EntryPointVersion = 'v0.7' | 'v0.8'

export function connectEntryPointV07(runner: ContractRunner) {
	return TEntryPointV07__factory.connect(ADDRESS.EntryPointV07, runner)
}

export function connectEntryPointV08(runner: ContractRunner) {
	return TEntryPointV08__factory.connect(ADDRESS.EntryPointV08, runner)
}

export function connectEntryPoint(version: EntryPointVersion, runner: ContractRunner) {
	switch (version) {
		case 'v0.7':
			return connectEntryPointV07(runner)
		case 'v0.8':
			return connectEntryPointV08(runner)
	}
}

export function connectRegistry(runner: ContractRunner) {
	return TRegistry__factory.connect(ADDRESS.Registry, runner)
}

export function encodeHandleOpsCalldata(userOps: UserOp[], beneficiary: string) {
	return TEntryPointV07__factory.createInterface().encodeFunctionData('handleOps', [
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
				return `${name}.${decodedError.name}${errorArgs} (Note: The prefix "${name}" may not correspond to the actual contract that triggered the revert.)`
			}
		} catch {
			// Continue to next interface if parsing fails
			continue
		}
	}

	return ''
}
