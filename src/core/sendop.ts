import { ADDRESS } from '@/addresses'
import { SendopError, UnsupportedEntryPointError } from '@/error'
import { getBytesLength, zeroPadRight } from '@/utils'
import { dataSlice, getBytes } from 'ethers'
import type { Bundler, OperationGetter, PaymasterGetter, SignatureGetter } from './interface'
import type { Execution, SendopOptions, SendOpResult } from './types'
import type { UserOperation, UserOperationReceipt } from '@/ethers-erc4337'
import {
	getEmptyUserOp,
	getUserOpHashV07,
	getUserOpHashV08,
	getV08DomainAndTypes,
	packUserOp,
} from '../ethers-erc4337/utils'

export async function sendop(options: SendopOptions): Promise<SendOpResult> {
	const { bundler, executions, opGetter, pmGetter, initCode, nonce } = options

	let userOp = await createUserOp(bundler, executions, opGetter, initCode, nonce)
	const estimation = await estimateUserOp(userOp, bundler, opGetter, pmGetter)
	userOp = estimation.userOp

	if (!estimation.pmIsFinal && pmGetter) {
		userOp = await getPaymasterData(userOp, pmGetter)
	}

	userOp = await signUserOp(userOp, bundler, opGetter)
	return sendUserOp(bundler, userOp)
}

export async function createUserOp(
	bundler: Bundler,
	executions: Execution[],
	opGetter: OperationGetter,
	initCode?: string,
	nonce?: bigint,
): Promise<UserOperation> {
	const userOp = getEmptyUserOp()

	// Parse initCode in options
	if (initCode && initCode !== '0x') {
		const { factory, factoryData } = parseInitCode(initCode, bundler.entryPointAddress)
		userOp.factory = factory
		userOp.factoryData = factoryData
	}

	function parseInitCode(initCode: string, entryPointAddress: string): { factory: string; factoryData: string } {
		// TODO: what's the situation to use 7702 initCode?
		const isSmartEOAInitCode =
			entryPointAddress === ADDRESS.EntryPointV08 && dataSlice(initCode, 0, 20) === zeroPadRight('0x7702', 20)

		if (!isSmartEOAInitCode) {
			// Standard initCode format: 0x + address + selector + data
			const minLength = 2 + 40 + 8 + 2
			if (getBytesLength(initCode) < minLength) {
				throw new Error('Invalid initCode')
			}
		}

		return {
			factory: dataSlice(initCode, 0, 20),
			factoryData: dataSlice(initCode, 20),
		}
	}

	// Create UserOperation
	userOp.sender = await opGetter.getSender()
	userOp.nonce = nonce ?? (await opGetter.getNonce())
	userOp.callData = await opGetter.getCallData(executions)

	return userOp
}

export async function estimateUserOp(
	userOp: UserOperation,
	bundler: Bundler,
	sigGetter: SignatureGetter,
	pmGetter?: PaymasterGetter,
): Promise<{
	userOp: UserOperation
	pmIsFinal: boolean
}> {
	// Paymaster Gas Estimation
	let pmIsFinal = false
	if (pmGetter) {
		// If pmGetter is provided, get paymaster stub values. See ERC-7677: https://eips.ethereum.org/EIPS/eip-7677
		const pmStubData = await pmGetter.getPaymasterStubData(userOp)
		userOp.paymaster = pmStubData.paymaster ?? undefined
		userOp.paymasterData = pmStubData.paymasterData ?? '0x'
		userOp.paymasterVerificationGasLimit = pmStubData.paymasterVerificationGasLimit ?? 0n
		userOp.paymasterPostOpGasLimit = pmStubData.paymasterPostOpGasLimit ?? 0n
		pmIsFinal = pmStubData.isFinal ?? false
	}

	// Dummy Signature
	userOp.signature = await sigGetter.getDummySignature(userOp)

	// Gas Estimation
	const gasValues = await bundler.getGasValues(userOp)
	userOp.maxFeePerGas = gasValues.maxFeePerGas
	userOp.maxPriorityFeePerGas = gasValues.maxPriorityFeePerGas
	userOp.preVerificationGas = gasValues.preVerificationGas
	userOp.verificationGasLimit = gasValues.verificationGasLimit
	userOp.callGasLimit = gasValues.callGasLimit
	userOp.paymasterVerificationGasLimit = gasValues.paymasterVerificationGasLimit
		? gasValues.paymasterVerificationGasLimit
		: 0n

	return {
		userOp,
		pmIsFinal,
	}
}

export async function getPaymasterData(userOp: UserOperation, pmGetter: PaymasterGetter): Promise<UserOperation> {
	if (pmGetter && pmGetter.getPaymasterData) {
		// If pmGetter is provided and pmIsFinal is false, retrieve the paymaster data, usually for signing purposes.
		const pmData = await pmGetter.getPaymasterData(userOp)
		userOp.paymaster = pmData.paymaster ?? undefined
		userOp.paymasterData = pmData.paymasterData ?? '0x'
	} else {
		throw new SendopError('Invalid paymaster getter')
	}

	return userOp
}

export async function signUserOp(
	userOp: UserOperation,
	bundler: Bundler,
	sigGetter: SignatureGetter,
): Promise<UserOperation> {
	switch (bundler.entryPointAddress) {
		case ADDRESS.EntryPointV07:
			userOp.signature = await sigGetter.getSignature({
				entryPointVersion: 'v0.7',
				hash: getBytes(getUserOpHashV07(userOp, bundler.chainId)),
				userOp,
			})
			break
		case ADDRESS.EntryPointV08:
			const { domain, types } = getV08DomainAndTypes(bundler.chainId)
			const packedUserOp = packUserOp(userOp)
			userOp.signature = await sigGetter.getSignature({
				entryPointVersion: 'v0.8',
				hash: getBytes(getUserOpHashV08(userOp, bundler.chainId)),
				userOp,
				domain,
				types,
				values: packedUserOp,
			})
			break
		default:
			throw new UnsupportedEntryPointError(bundler.entryPointAddress)
	}

	return userOp
}

export async function sendUserOp(bundler: Bundler, userOp: UserOperation): Promise<SendOpResult> {
	const userOpHash = await bundler.sendUserOperation(userOp)

	return {
		hash: userOpHash,
		async wait() {
			let result: UserOperationReceipt | null = null
			while (result === null) {
				result = await bundler.getUserOperationReceipt(userOpHash)
				if (result === null) {
					await new Promise(resolve => setTimeout(resolve, 1000))
				}
			}
			return result
		},
	}
}
