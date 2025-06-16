import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import {
	concatBytesList,
	getSmartSessionUseModeSignature,
	KernelV3Account,
	PimlicoBundler,
	PublicPaymaster,
	sendop,
	type Bundler,
	type PaymasterGetter,
	type SignatureData,
} from '@/index'
import { INTERFACES } from '@/interfaces'
import { KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import type { Signer } from 'ethers'
import { Contract, formatUnits, JsonRpcProvider, parseUnits } from 'ethers'
import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { setup } from '../utils'
import { calculateSwapParams, USDC_DECIMALS, WETH_DECIMALS } from './utils'

/*
bun run test/scheduled-swap/execute-swap.ts -n sepolia 
*/

const argv = await yargs(hideBin(process.argv))
	.option('network', {
		alias: 'n',
		choices: ['local', 'sepolia'] as const,
		description: 'Network (local or sepolia)',
		demandOption: true,
	})
	.help().argv

const CHAIN_IDS = {
	local: 1337n,
	sepolia: 11155111n,
} as const
const chainId = CHAIN_IDS[argv.network]
const { logger, CLIENT_URL, BUNDLER_URL, account1 } = await setup({ chainId })

const jobId = 1n
const permissionId = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'
const kernelAddress = fs.readFileSync(path.join(__dirname, 'deployed-address.txt'), 'utf8')
logger.info(`Kernel address: ${kernelAddress}`)

logger.info(`Chain ID: ${chainId}`)

const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	parseError: true,
	// debugSend: true,
})

const pmGetter = new PublicPaymaster(ADDRESS.PublicPaymaster)

const USDC_WETH_POOL = '0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1' // fee 500

const poolAbi = [
	'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
]

const pool = new Contract(USDC_WETH_POOL, poolAbi, client)

const slot0 = await pool.slot0()
const currentSqrtPriceX96 = slot0.sqrtPriceX96
logger.info(`Current sqrtPriceX96: ${currentSqrtPriceX96}`)

const slippageTolerance = 0.005 // 0.5%
const amountIn = parseUnits('1000', 6) // 1000 USDC

// Calculate swap parameters using the utility function
// zeroForOne = true means USDC (token0) -> WETH (token1)
const { sqrtPriceLimitX96, amountOutMinimum } = calculateSwapParams({
	currentSqrtPriceX96,
	slippageTolerance,
	amountIn,
	token0Decimals: USDC_DECIMALS,
	token1Decimals: WETH_DECIMALS,
	zeroForOne: true,
})

const fee = 500n

logger.info(`Amount in: ${formatUnits(amountIn, 6)} USDC`)
logger.info(`Amount out minimum: ${formatUnits(amountOutMinimum, 18)} ETH`)
logger.info(`Sqrt price limit X96: ${sqrtPriceLimitX96}`)

const receipt = await executeScheduledSwap({
	accountAddress: kernelAddress,
	permissionId,
	jobId: jobId,
	client,
	bundler,
	pmGetter,
	sessionSigner: account1,
	sqrtPriceLimitX96,
	amountOutMinimum,
	fee,
})

logger.info(`Execution success: ${receipt.success}`)

export async function executeScheduledSwap({
	accountAddress,
	permissionId,
	jobId,
	client,
	bundler,
	pmGetter,
	sessionSigner,
	sqrtPriceLimitX96,
	amountOutMinimum,
	fee,
}: {
	accountAddress: string
	permissionId: string
	jobId: bigint
	client: JsonRpcProvider
	bundler: Bundler
	pmGetter: PaymasterGetter
	sessionSigner: Signer
	sqrtPriceLimitX96: bigint
	amountOutMinimum: bigint
	fee: bigint
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
				to: ADDRESS.ScheduledOrders,
				value: 0n,
				data: INTERFACES.ScheduledOrders.encodeFunctionData('executeOrder', [
					jobId,
					sqrtPriceLimitX96,
					amountOutMinimum,
					fee,
				]),
			},
		],
		opGetter: kernel,
		pmGetter,
	})

	logger.info(`hash: ${op.hash}`)
	return await op.wait()
}
