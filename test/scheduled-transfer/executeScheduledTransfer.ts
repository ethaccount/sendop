import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import {
	concatBytesList,
	getSmartSessionUseModeSignature,
	KernelV3Account,
	sendop,
	type Bundler,
	type PaymasterGetter,
	type SignatureData,
} from '@/index'
import { INTERFACES } from '@/interfaces'
import { KernelValidationType } from '@/accounts'
import type { JsonRpcProvider, Signer } from 'ethers'
import { logger } from 'test/utils'

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
			getSignature: async (signatureData: SignatureData) => {
				switch (signatureData.entryPointVersion) {
					case 'v0.7':
						const threshold = 1
						const signature = await sessionSigner.signMessage(signatureData.hash)
						return getSmartSessionUseModeSignature(
							permissionId,
							concatBytesList(Array(threshold).fill(signature)),
						)

					case 'v0.8':
						throw new Error('SmartSession validator does not support v0.8')
				}
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
