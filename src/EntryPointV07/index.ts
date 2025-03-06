import { ENTRY_POINT_V07, packUserOp, type UserOp } from '@/core'
import { EntryPoint__factory as EntryPointV07__factory } from './factories/EntryPoint__factory'
import { Interface, type ContractRunner } from 'ethers'

export type { EntryPoint as EntryPointV07 } from './EntryPoint'
export { EntryPointV07__factory }

export const EntryPointV07Interface = new Interface(EntryPointV07__factory.abi)

export function getHandleOpsCalldata(userOp: UserOp, beneficiary: string) {
	return EntryPointV07Interface.encodeFunctionData('handleOps', [[packUserOp(userOp)], beneficiary])
}

export function getEntryPointV07(runner: ContractRunner) {
	return EntryPointV07__factory.connect(ENTRY_POINT_V07, runner)
}
