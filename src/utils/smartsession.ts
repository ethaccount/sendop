import type { SessionStruct } from '@/contract-types/SmartSession'
import { keccak256 } from 'ethers'
import { abiEncode } from './ethers-helper'

export const SMART_SESSIONS_USE_MODE = '0x00'
export const SMART_SESSIONS_ENABLE_MODE = '0x01'
export const SMART_SESSIONS_UNSAFE_ENABLE_MODE = '0x02'

export type SmartSessionsMode =
	| typeof SMART_SESSIONS_USE_MODE
	| typeof SMART_SESSIONS_ENABLE_MODE
	| typeof SMART_SESSIONS_UNSAFE_ENABLE_MODE

export function isEnableMode(mode: SmartSessionsMode) {
	return mode === SMART_SESSIONS_ENABLE_MODE || mode === SMART_SESSIONS_UNSAFE_ENABLE_MODE
}

export function getPermissionId(session: SessionStruct) {
	return keccak256(
		abiEncode(
			['address', 'bytes', 'bytes32'],
			[session.sessionValidator, session.sessionValidatorInitData, session.salt],
		),
	)
}
