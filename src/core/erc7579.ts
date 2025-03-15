export enum ERC7579_MODULE_TYPE {
	VALIDATOR = 1,
	EXECUTOR = 2,
	FALLBACK = 3,
	HOOK = 4,
	STATELESS_VALIDATOR = 7,
	PREVALIDATION_HOOK_ERC1271 = 8,
	PREVALIDATION_HOOK_ERC4337 = 9,
}

export enum PolicyType {
	NA = 0,
	USER_OP = 1,
	ACTION = 2,
	ERC1271 = 3,
}

// =============================== ExecutionMode ===============================

export enum CallType {
	SIGNLE = '0x00',
	BATCH = '0x01',
}

export enum ExecType {
	DEFAULT = '0x00',
	TRY_REVERT = '0x01',
}

export enum ModeSelector {
	DEFAULT = '0x00000000',
}
