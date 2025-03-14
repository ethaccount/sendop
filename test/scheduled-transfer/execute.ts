import ADDRESS from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { KernelV3Account, KernelValidationType, PimlicoBundler, sendop, SMART_SESSIONS_USE_MODE } from '@/index'
import INTERFACES from '@/interfaces'
import { concat, JsonRpcProvider } from 'ethers'
import { MyPaymaster, setup } from '../../test/utils'

const jobId = 1
const permissionId = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'
const kerneAddress = '0xac3E5b60a45B120E0659b533f37345ACae6D66dE'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, account1 } = await setup({ chainId: 'local' })

logger.info(`Chain ID: ${chainId}`)

const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	parseError: true,
	async onBeforeEstimation(userOp) {
		logger.info('onBeforeEstimation', userOp)
		return userOp
	},
	// debugHandleOps: true,
})

const pmGetter = new MyPaymaster({
	client,
	paymasterAddress: ADDRESS.CharityPaymaster,
})

const kernel = new KernelV3Account(kerneAddress, {
	client,
	bundler,
	erc7579Validator: {
		address: () => ADDRESS.SmartSession,
		getDummySignature: () => {
			const threshold = 1
			return getSmartSessionUseModeSignature(
				permissionId,
				concatHexString(Array(threshold).fill(DUMMY_ECDSA_SIGNATURE)),
			)
		},
		getSignature: async (userOpHash: Uint8Array) => {
			const threshold = 1
			const signature = await account1.signMessage(userOpHash)
			return getSmartSessionUseModeSignature(permissionId, concatHexString(Array(threshold).fill(signature)))
		},
	},
})

const op = await sendop({
	bundler,
	nonce: await kernel.getCustomNonce({
		type: KernelValidationType.VALIDATOR,
	}),
	executions: [
		{
			to: ADDRESS.ScheduledTransfers,
			value: '0x0',
			data: INTERFACES.ScheduledTransfers.encodeFunctionData('executeOrder', [jobId]),
		},
	],
	opGetter: kernel,
	pmGetter,
})

logger.info(`hash: ${op.hash}`)

const receipt = await op.wait()
logger.info('userOp success:', receipt.success)

function getSmartSessionUseModeSignature(permissionId: string, signature: string) {
	return concat([SMART_SESSIONS_USE_MODE, permissionId, signature])
}

function concatHexString(hexStrings: string[]) {
	return hexStrings.reduce((acc, hexString) => {
		return concat([acc, hexString])
	}, '0x')
}
