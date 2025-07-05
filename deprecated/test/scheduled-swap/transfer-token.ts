import { ADDRESS } from '@/addresses'
import { EOAValidator, KernelV3Account, PimlicoBundler, sendop } from '@/index'
import { INTERFACES } from '@/interfaces'
import { DeprecatedPublicPaymaster } from '@/paymasters'
import { JsonRpcProvider, parseEther, Wallet } from 'ethers'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { setup } from '../utils'

// bun run test/scheduled-swap/transfer-token.ts -n sepolia

const accountAddress = '0x4195A1CF56f69aeEda0FF3fDdb29458134238fcd'

const argv = await yargs(hideBin(process.argv))
	.option('network', {
		alias: 'n',
		choices: ['local', 'sepolia'] as const,
		description: 'Network (local or sepolia)',
		demandOption: true,
	})
	.option('bundler', {
		alias: 'b',
		choices: ['alchemy', 'pimlico'] as const,
		description: 'Bundler (alchemy or pimlico)',
		demandOption: false,
		default: 'pimlico',
	})
	.help().argv

const CHAIN_IDS = {
	local: 1337n,
	sepolia: 11155111n,
} as const
const chainId = CHAIN_IDS[argv.network]
const { logger, CLIENT_URL, BUNDLER_URL, privateKey, account1 } = await setup({ chainId })

logger.info(`Chain ID: ${chainId}`)

const signer = new Wallet(privateKey)
const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	parseError: true,
})

const pmGetter = new DeprecatedPublicPaymaster(ADDRESS.PublicPaymaster)

const kernel = new KernelV3Account({
	address: accountAddress,
	client,
	bundler,
	validator: new EOAValidator({
		address: ADDRESS.ECDSAValidator,
		signer,
	}),
})

const op = await sendop({
	bundler,
	executions: [
		{
			to: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
			value: 0n,
			data: INTERFACES.IERC20.encodeFunctionData('transfer', [
				'0xd78B5013757Ea4A7841811eF770711e6248dC282',
				162042380145n,
			]),
		},
	],
	opGetter: kernel,
	pmGetter,
})

logger.info(`hash: ${op.hash}`)

const receipt = await op.wait()
logger.info('account address:', kernel.address)
logger.info('userOp success:', receipt.success)
