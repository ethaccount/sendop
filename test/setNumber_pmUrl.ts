import { sendop } from '@/core'
import { KernelV3Account } from '@/smart-accounts'
import { EOAValidatorModule } from '@/validators/EOAValidatorModule'
import { Interface, JsonRpcProvider, toNumber, Wallet } from 'ethers'
import { PimlicoPaymaster, setup } from './utils'
import { PimlicoBundler } from '@/bundlers/PimlicoBundler'
import ADDRESS from '@/addresses'

// only works for sepolia

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup()
logger.info(`Chain ID: ${chainId}`)

const FROM = '0x182260E0b7fF3B72DeAa6c99f1a50F2380a4Fb00'

const number = Math.floor(Math.random() * 10000)
logger.info(`Setting number to ${number}`)

logger.info('Sending op...')
const op = await sendop({
	bundler: new PimlicoBundler(chainId, BUNDLER_URL),
	executions: [
		{
			to: ADDRESS.Counter,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
			value: 0n,
		},
	],
	opGetter: new KernelV3Account({
		address: FROM,
		client: new JsonRpcProvider(CLIENT_URL),
		bundler: new PimlicoBundler(chainId, BUNDLER_URL),
		erc7579Validator: new EOAValidatorModule({
			address: ADDRESS.K1Validator,
			signer: new Wallet(privateKey),
		}),
	}),
	pmGetter: new PimlicoPaymaster({
		chainId,
		url: BUNDLER_URL,
	}),
})

logger.info('Waiting for receipt...')
const receipt = await op.wait()
logger.info(JSON.stringify(receipt, null, 2))

if (receipt.logs.length > 0) {
	const log = receipt.logs[receipt.logs.length - 1]
	logger.info(toNumber(log.data))
}
