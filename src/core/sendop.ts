import { ADDRESS } from '@/addresses'
import { getBytesLength } from '@/utils'
import { getBytes, toBeHex } from 'ethers'
import type { Bundler } from './interface'
import type { BuildopResult, SendopOptions, SendOpResult, UserOp, UserOpReceipt } from './types'
import { getEmptyUserOp, getUserOpHash, packUserOp } from './utils'

export async function sendop(options: SendopOptions): Promise<SendOpResult> {
	const { bundler, opGetter } = options
	const { userOp, userOpHash } = await buildop(options)

	userOp.signature = await opGetter.getSignature(getBytes(userOpHash), userOp)

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
		// 0x + address + selector + data
		if (getBytesLength(initCode) < 2 + 40 + 8 + 2) {
			throw new Error('Invalid initCode')
		}

		const initCodeWithoutPrefix = initCode.slice(2) // remove 0x prefix
		userOp.factory = '0x' + initCodeWithoutPrefix.slice(0, 40)
		userOp.factoryData = '0x' + initCodeWithoutPrefix.slice(40)
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

	const userOpHash = getUserOpHash(packUserOp(userOp), ADDRESS.EntryPointV7, bundler.chainId)

	return {
		userOp,
		userOpHash,
	}
}
