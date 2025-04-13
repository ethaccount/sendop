import { ADDRESS } from '@/addresses'
import { UnsupportedEntryPointError } from '@/error'
import { getBytesLength, zeroPadRight } from '@/utils'
import { dataSlice, getBytes, hexlify, toBeHex } from 'ethers'
import type { Bundler } from './interface'
import type { BuildopResult, SendopOptions, SendOpResult, UserOp, UserOpReceipt } from './types'
import { getEmptyUserOp, getUserOpHash, getUserOpHashV08, getV08DomainAndTypes, packUserOp } from './utils'

export async function sendop(options: SendopOptions): Promise<SendOpResult> {
	const { bundler, opGetter } = options
	const { userOp, userOpHash } = await buildop(options)

	switch (bundler.entryPointAddress) {
		case ADDRESS.EntryPointV07:
			userOp.signature = await opGetter.getSignature({
				entryPointVersion: 'v0.7',
				hash: getBytes(userOpHash),
				userOp,
			})
			break
		case ADDRESS.EntryPointV08:
			const { domain, types } = getV08DomainAndTypes(bundler.chainId)
			const packedUserOp = packUserOp(userOp)
			userOp.signature = await opGetter.getSignature({
				entryPointVersion: 'v0.8',
				hash: getBytes(getUserOpHashV08(packedUserOp, bundler.chainId)),
				userOp,
				domain,
				types,
				values: packedUserOp,
			})
			break
		default:
			throw new UnsupportedEntryPointError(bundler.entryPointAddress)
	}

	return send(bundler, userOp)
}

export async function send(bundler: Bundler, userOp: UserOp): Promise<SendOpResult> {
	const userOpHash = await bundler.sendUserOperation(userOp)

	return {
		hash: userOpHash,
		async wait() {
			let result: UserOpReceipt | null = null
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

export async function buildop(options: SendopOptions): Promise<BuildopResult> {
	const { bundler, executions, opGetter, pmGetter, initCode, nonce } = options

	const userOp = getEmptyUserOp()
	userOp.sender = await opGetter.getSender()

	if (initCode && initCode !== '0x') {
		const { factory, factoryData } = parseInitCode(initCode, bundler.entryPointAddress)
		userOp.factory = factory
		userOp.factoryData = factoryData
	}

	function parseInitCode(initCode: string, entryPointAddress: string): { factory: string; factoryData: string } {
		const isEIP7702InitCode =
			entryPointAddress === ADDRESS.EntryPointV08 && dataSlice(initCode, 0, 20) === zeroPadRight('0x7702', 20)

		if (!isEIP7702InitCode) {
			// Standard initCode format: 0x + address + selector + data
			const minLength = 2 + 40 + 8 + 2
			if (getBytesLength(initCode) < minLength) {
				throw new Error('Invalid initCode')
			}
		}

		return {
			factory: dataSlice(initCode, 0, 40),
			factoryData: dataSlice(initCode, 40),
		}
	}

	userOp.nonce = nonce ? toBeHex(nonce) : await opGetter.getNonce()
	userOp.callData = await opGetter.getCallData(executions)

	// if pm, get pmStubData
	let pmIsFinal = false
	if (pmGetter) {
		const pmStubData = await pmGetter.getPaymasterStubData(userOp)
		userOp.paymaster = pmStubData.paymaster ?? null
		userOp.paymasterData = pmStubData.paymasterData ?? '0x'
		userOp.paymasterVerificationGasLimit = pmStubData.paymasterVerificationGasLimit ?? '0x0'
		userOp.paymasterPostOpGasLimit = pmStubData.paymasterPostOpGasLimit ?? '0x0'
		pmIsFinal = pmStubData.isFinal ?? false
	}

	userOp.signature = await opGetter.getDummySignature(userOp)

	// esitmate userOp
	// Note: user operation max fee per gas must be larger than 0 during gas estimation

	const gasValues = await bundler.getGasValues(userOp)
	userOp.maxFeePerGas = gasValues.maxFeePerGas
	userOp.maxPriorityFeePerGas = gasValues.maxPriorityFeePerGas
	userOp.preVerificationGas = gasValues.preVerificationGas
	userOp.verificationGasLimit = gasValues.verificationGasLimit
	userOp.callGasLimit = gasValues.callGasLimit

	// if pm && !isFinal, get pmData
	if (pmGetter && pmGetter.getPaymasterData && !pmIsFinal) {
		const pmData = await pmGetter.getPaymasterData(userOp)
		userOp.paymaster = pmData.paymaster ?? null
		userOp.paymasterData = pmData.paymasterData ?? '0x'
	}

	const userOpHash = getUserOpHash(packUserOp(userOp), bundler.entryPointAddress, bundler.chainId)

	return {
		userOp,
		userOpHash,
	}
}
