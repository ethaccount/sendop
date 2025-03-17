import ADDRESS from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import {
	concatBytesList,
	getSmartSessionUseModeSignature,
	KernelV3Account,
	sendop,
	type Bundler,
	type PaymasterGetter,
} from '@/index'
import INTERFACES from '@/interfaces'
import { KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import type { JsonRpcProvider, Signer } from 'ethers'
import { logger } from 'script/common'

export async function executeScheduledTransfer({
	accountAddress,
	permissionId,
	jobId,
	client,
	bundler,
	pmGetter,
	sessionSigner,
}: {
	accountAddress: string
	permissionId: string
	jobId: bigint
	client: JsonRpcProvider
	bundler: Bundler
	pmGetter: PaymasterGetter
	sessionSigner: Signer
}) {
	const kernel = new KernelV3Account({
		address: accountAddress,
		client,
		bundler,
		nonce: {
			type: KernelValidationType.VALIDATOR,
		},
		validator: {
			address: () => ADDRESS.SmartSession,
			getDummySignature: () => {
				const threshold = 1
				return getSmartSessionUseModeSignature(
					permissionId,
					concatBytesList(Array(threshold).fill(DUMMY_ECDSA_SIGNATURE)),
				)
			},
			getSignature: async (userOpHash: Uint8Array) => {
				const threshold = 1
				const signature = await sessionSigner.signMessage(userOpHash)
				return getSmartSessionUseModeSignature(permissionId, concatBytesList(Array(threshold).fill(signature)))
			},
		},
	})

	const op = await sendop({
		bundler,
		executions: [
			{
				to: ADDRESS.ScheduledTransfers,
				value: 0n,
				data: INTERFACES.ScheduledTransfers.encodeFunctionData('executeOrder', [jobId]),
			},
		],
		opGetter: kernel,
		pmGetter,
	})

	logger.info(`hash: ${op.hash}`)
	return await op.wait()
}
