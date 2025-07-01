import { CallType, encodeExecutions, ExecType, ModeSelector, type Execution } from '@/core'
import { INTERFACES } from '@/interfaces'
import { KernelValidationMode, KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { isBytes, randomBytes32, toBytes32, zeroBytes } from '@/utils'
import type { TypedDataDomain } from 'ethers'
import type { TypedDataField } from 'ethers'
import type { BigNumberish } from 'ethers'
import { concat, Contract, Interface, JsonRpcProvider, ZeroAddress } from 'ethers'
import { ENTRY_POINT_V07_ADDRESS, EntryPointV07__factory, type TypedData } from 'ethers-erc4337'

const KERNEL_V3_3_FACTORY = '0x2577507b78c2008Ff367261CB6285d44ba5eF2E9'

export async function getKernelAddress(
	client: JsonRpcProvider,
	validatorAddress: string,
	validatorData: string,
	salt: string = randomBytes32(),
): Promise<{
	factory: string
	factoryData: string
	accountAddress: string
}> {
	const KERNEL_V3_3_FACTORY_ABI = [
		'function getAddress(bytes calldata data, bytes32 salt) public view returns (address)',
		'function createAccount(bytes calldata data, bytes32 salt) public payable returns (address)',
	]

	const KERNEL_V3_3_ABI = [
		'function initialize(bytes21 _rootValidator, address hook, bytes calldata validatorData, bytes calldata hookData, bytes[] calldata initConfig) external',
	]

	const initializeData = new Interface(KERNEL_V3_3_ABI).encodeFunctionData('initialize', [
		concat([KernelValidationType.VALIDATOR, validatorAddress]),
		ZeroAddress,
		validatorData,
		'0x',
		[],
	])

	const factoryData = new Interface(KERNEL_V3_3_FACTORY_ABI).encodeFunctionData('createAccount', [
		initializeData,
		salt,
	])

	const kernelFactory = new Contract(KERNEL_V3_3_FACTORY, KERNEL_V3_3_FACTORY_ABI, client)
	const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

	return { factory: KERNEL_V3_3_FACTORY, factoryData, accountAddress }
}

export async function getKernelNonce(client: JsonRpcProvider, accountAddress: string, validatorAddress: string) {
	const defaultOptions = {
		mode: KernelValidationMode.DEFAULT,
		type: KernelValidationType.ROOT,
		identifier: validatorAddress,
		key: zeroBytes(2),
	}
	const { mode, type, identifier, key } = defaultOptions
	const nonceKey = BigInt(concat([mode, type, identifier, key]))

	const entryPoint = EntryPointV07__factory.connect(ENTRY_POINT_V07_ADDRESS, client)
	return await entryPoint.getNonce(accountAddress, nonceKey)
}

export async function encodeKernelExecutionData(executions: Execution[]) {
	if (!executions.length) {
		return '0x'
	}

	const defaultExecutionMode = {
		callType: CallType.BATCH,
		execType: ExecType.DEFAULT,
		unused: zeroBytes(4),
		modeSelector: ModeSelector.DEFAULT,
		modePayload: zeroBytes(22),
	}

	let { callType, execType, modeSelector, modePayload, unused } = {
		...defaultExecutionMode,
	}

	if (executions.length === 1) {
		callType = CallType.SIGNLE
	}

	if (!isBytes(callType, 1)) throw new Error(`invalid callType ${callType}`)
	if (!isBytes(execType, 1)) throw new Error(`invalid execType ${execType}`)
	if (!isBytes(unused, 4)) throw new Error(`invalid unused ${unused}`)
	if (!isBytes(modeSelector, 4)) throw new Error(`invalid modeSelector ${modeSelector}`)
	if (!isBytes(modePayload, 22)) throw new Error(`invalid modePayload ${modePayload}`)

	const execMode = concat([callType, execType, unused, modeSelector, modePayload])

	switch (callType) {
		case CallType.SIGNLE:
			return INTERFACES.IERC7579Account.encodeFunctionData('execute', [
				execMode,
				concat([executions[0].to, toBytes32(executions[0].value), executions[0].data]),
			])
		case CallType.BATCH:
			return INTERFACES.IERC7579Account.encodeFunctionData('execute', [execMode, encodeExecutions(executions)])
		default:
			throw new Error('unsupported call type')
	}
}

interface Signer {
	signTypedData(
		domain: TypedDataDomain,
		types: Record<string, Array<TypedDataField>>,
		value: Record<string, any>,
	): Promise<string>
}

export async function signKernelERC1271Signature({
	version = '0.3.3',
	validator,
	hash,
	chainId,
	accountAddress,
	signer,
}: {
	version: '0.3.3' | '0.3.1'
	validator: string
	hash: Uint8Array
	chainId: BigNumberish
	accountAddress: string
	signer: Signer
}) {
	const typedData: TypedData = [
		{
			name: 'Kernel',
			version,
			chainId,
			verifyingContract: accountAddress,
		},
		{
			Kernel: [{ name: 'hash', type: 'bytes32' }],
		},
		{
			hash: hash,
		},
	]

	const sig = await signer.signTypedData(...typedData)

	return concat([
		'0x01', // validator mode
		validator,
		sig,
	])
}
