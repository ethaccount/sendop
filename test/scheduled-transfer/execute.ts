import ADDRESS from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { KernelV3Account, PimlicoBundler, sendop, SMART_SESSIONS_USE_MODE } from '@/index'
import { KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import INTERFACES from '@/interfaces'
import { concat, JsonRpcProvider } from 'ethers'
import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { MyPaymaster, setup } from '../../test/utils'

const argv = await yargs(hideBin(process.argv))
	.option('network', {
		alias: 'n',
		choices: ['local', 'sepolia'] as const,
		description: 'Network (local or sepolia)',
		demandOption: true,
	})
	.help().argv

const network = argv.network === 'sepolia' ? '11155111' : 'local'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, account1 } = await setup({ chainId: network })

const jobId = 1
const permissionId = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'
const kernelAddress = fs.readFileSync(path.join(__dirname, 'deployed-address.txt'), 'utf8')
logger.info(`Kernel address: ${kernelAddress}`)

logger.info(`Chain ID: ${chainId}`)

const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	parseError: true,
	// async onBeforeEstimation(userOp) {
	// 	logger.info('onBeforeEstimation', userOp)
	// 	return userOp
	// },
	// async onBeforeSendUserOp(userOp) {
	// 	logger.info('onBeforeSendUserOp', userOp)
	// 	return userOp
	// },
	// debugHandleOps: true,
})

const pmGetter = new MyPaymaster({
	client,
	paymasterAddress: ADDRESS.CharityPaymaster,
})

const kernel = new KernelV3Account({
	address: kernelAddress,
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
