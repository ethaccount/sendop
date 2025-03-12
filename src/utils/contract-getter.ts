import ADDRESS from '@/addresses'

import { EntryPointV7__factory } from '@/contract-types'

import type { ContractRunner } from 'ethers'

export function connectEntryPointV07(runner: ContractRunner) {
	return EntryPointV7__factory.connect(ADDRESS.EntryPointV7, runner)
}
