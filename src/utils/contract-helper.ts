import { ADDRESS } from '@/addresses'
import { EntryPointV07__factory, EntryPointV08__factory, Registry__factory } from '@/contract-types'
import { packUserOp, type UserOperation } from '@/core'
import { INTERFACES } from '@/interfaces'
import type { ContractRunner } from 'ethers'

export type EntryPointVersion = 'v0.7' | 'v0.8'

export function connectEntryPointV07(runner: ContractRunner) {
	return EntryPointV07__factory.connect(ADDRESS.EntryPointV07, runner)
}

export function connectEntryPointV08(runner: ContractRunner) {
	return EntryPointV08__factory.connect(ADDRESS.EntryPointV08, runner)
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
	return Registry__factory.connect(ADDRESS.Registry, runner)
}

export function encodeHandleOpsCalldata(userOps: UserOperation[], beneficiary: string) {
	return EntryPointV07__factory.createInterface().encodeFunctionData('handleOps', [
		userOps.map(op => packUserOp(op)),
		beneficiary,
	])
}

export function parseContractError(revert: string, nameOnly?: boolean): string {
	if (!revert) return ''

	for (const [name, iface] of Object.entries(INTERFACES)) {
		try {
			const decodedError = iface.parseError(revert)

			if (decodedError) {
				const errorArgs = decodedError.args.length > 0 ? `(${decodedError.args.join(', ')})` : ''

				if (nameOnly) {
					return revert + ` (${decodedError.name}${errorArgs})`
				}
				return `${name}.${decodedError.name}${errorArgs} (Note: The prefix "${name}" may not correspond to the actual contract that triggered the revert.)`
			}
		} catch {
			// Continue to next interface if parsing fails
			continue
		}
	}

	return ''
}

export function extractHexString(input: string): string | null {
	// Regex to match 0x followed by one or more hex characters
	const hexPattern = /0x[0-9a-fA-F]+/
	const match = input.match(hexPattern)

	return match ? match[0] : null
}

export function replaceHexString(input: string, replacement: string): string {
	// Regex to match 0x followed by one or more hex characters
	const hexPattern = /0x[0-9a-fA-F]+/g

	return input.replace(hexPattern, replacement)
}
