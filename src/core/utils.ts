import { ADDRESS } from '@/addresses'
import { SendopError } from '@/error'
import { abiEncode, isBytes, type EntryPointVersion } from '@/utils'
import { AbiCoder, concat, isAddress, keccak256, toBeHex, zeroPadValue, type TypedDataDomain } from 'ethers'
import type { Execution, PackedUserOp, UserOp } from './types'
import { TypedDataEncoder } from 'ethers'

export function getEmptyUserOp(): UserOp {
	return {
		sender: '',
		nonce: '0x0',
		factory: null,
		factoryData: '0x',
		callData: '0x',
		callGasLimit: '0x0',
		verificationGasLimit: '0x0',
		preVerificationGas: '0x0',
		maxFeePerGas: '0x0',
		maxPriorityFeePerGas: '0x0',
		paymaster: null,
		paymasterVerificationGasLimit: '0x0',
		paymasterPostOpGasLimit: '0x0',
		paymasterData: '0x',
		signature: '0x',
	}
}

export function packUserOp(userOp: UserOp): PackedUserOp {
	return {
		sender: userOp.sender,
		nonce: userOp.nonce,
		initCode: userOp.factory && userOp.factoryData ? concat([userOp.factory, userOp.factoryData]) : '0x',
		callData: userOp.callData,
		accountGasLimits: concat([
			zeroPadValue(toBeHex(userOp.verificationGasLimit), 16),
			zeroPadValue(toBeHex(userOp.callGasLimit), 16),
		]),
		preVerificationGas: zeroPadValue(toBeHex(userOp.preVerificationGas), 32),
		gasFees: concat([
			zeroPadValue(toBeHex(userOp.maxPriorityFeePerGas), 16),
			zeroPadValue(toBeHex(userOp.maxFeePerGas), 16),
		]),
		paymasterAndData:
			userOp.paymaster && userOp.paymasterData
				? concat([
						userOp.paymaster,
						zeroPadValue(toBeHex(userOp.paymasterVerificationGasLimit), 16),
						zeroPadValue(toBeHex(userOp.paymasterPostOpGasLimit), 16),
						userOp.paymasterData,
				  ])
				: '0x',
		signature: userOp.signature,
	}
}

export function getUserOpHash(op: PackedUserOp, entryPointAddress: string, chainId: string): string {
	switch (entryPointAddress) {
		case ADDRESS.EntryPointV07:
			return getUserOpHashV07(op, chainId)
		case ADDRESS.EntryPointV08:
			return getUserOpHashV08(op, chainId)
		default:
			throw new SendopError(`Unsupported entry point address (${entryPointAddress})`)
	}
}

export function getUserOpHashV07(op: PackedUserOp, chainId: string): string {
	const hashedInitCode = keccak256(op.initCode)
	const hashedCallData = keccak256(op.callData)
	const hashedPaymasterAndData = keccak256(op.paymasterAndData)
	const abiCoder = new AbiCoder()
	const encoded = abiCoder.encode(
		['bytes32', 'address', 'uint256'],
		[
			keccak256(
				abiCoder.encode(
					['address', 'uint256', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32', 'bytes32'],
					[
						op.sender,
						op.nonce,
						hashedInitCode,
						hashedCallData,
						op.accountGasLimits,
						op.preVerificationGas,
						op.gasFees,
						hashedPaymasterAndData,
					],
				),
			),
			ADDRESS.EntryPointV07,
			BigInt(chainId),
		],
	)
	return keccak256(encoded)
}

export function getUserOpHashV08(op: PackedUserOp, chainId: string): string {
	const domain: TypedDataDomain = {
		name: 'ERC4337',
		version: '1',
		chainId,
		verifyingContract: ADDRESS.EntryPointV08,
	}

	const types = {
		PackedUserOperation: [
			{ name: 'sender', type: 'address' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'initCode', type: 'bytes' },
			{ name: 'callData', type: 'bytes' },
			{ name: 'accountGasLimits', type: 'bytes32' },
			{ name: 'preVerificationGas', type: 'uint256' },
			{ name: 'gasFees', type: 'bytes32' },
			{ name: 'paymasterAndData', type: 'bytes' },
		],
	}

	return TypedDataEncoder.hash(domain, types, op)
}

export function encodeExecution(execution: Execution) {
	assertExecution(execution)
	return abiEncode(['address', 'uint256', 'bytes'], [execution.to, execution.value, execution.data])
}

export function encodeExecutions(executions: Execution[]) {
	assertExecutions(executions)
	return abiEncode(
		['tuple(address,uint256,bytes)[]'],
		[executions.map(execution => [execution.to, execution.value, execution.data])],
	)
}

export function assertExecution(execution: Execution) {
	if (!isBytes(execution.data)) {
		throw new SendopError(`Invalid execution data (${execution.data})`)
	}
	if (!isAddress(execution.to)) {
		throw new SendopError(`Invalid execution to (${execution.to})`)
	}
}

export function assertExecutions(executions: Execution[]) {
	for (const execution of executions) {
		assertExecution(execution)
	}
}
