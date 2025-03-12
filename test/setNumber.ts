import { ECDSA_VALIDATOR, CHARITY_PAYMASTER, COUNTER } from '@/address'
import { PimlicoBundler } from '@/bundlers/PimlicoBundler'
import { sendop } from '@/core'
import { Kernel } from '@/smart_accounts'
import { ECDSAValidatorModule } from '@/validators/ECDSAValidatorModule'
import { getAddress, Interface, JsonRpcProvider, toNumber, Wallet } from 'ethers'
import { MyPaymaster, setup } from './utils'

const { logger, chainId, CLIENT_URL, PIMLICO_BUNDLER_URL, privateKey } = await setup({ chainId: '11155111' })
logger.info(`Chain ID: ${chainId}`)

const FROM = '0x69F062dA4F6e200e235F66e151E2733E5ed306b9' // kernel on sepolia

const number = Math.floor(Math.random() * 10000)
logger.info(`Setting number to ${number}`)

const client = new JsonRpcProvider(CLIENT_URL)
const bundler = new PimlicoBundler(chainId, PIMLICO_BUNDLER_URL)
const signer = new Wallet(privateKey)

logger.info('Sending op...')
const op = await sendop({
	bundler,
	executions: [
		{
			to: COUNTER,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
			value: '0x0',
		},
	],
	opGetter: new Kernel(FROM, {
		client,
		bundler,
		erc7579Validator: new ECDSAValidatorModule({
			address: ECDSA_VALIDATOR,
			client,
			signer,
		}),
	}),
	pmGetter: new MyPaymaster({
		client,
		paymasterAddress: CHARITY_PAYMASTER,
	}),
})

const startTime = Date.now()
logger.info('Waiting for receipt...')
const receipt = await op.wait()
const duration = (Date.now() - startTime) / 1000 // Convert to seconds
logger.info(`Receipt received after ${duration.toFixed(2)} seconds`)

const log = receipt.logs.find(log => getAddress(log.address) === getAddress(COUNTER))
if (log && toNumber(log.data) === number) {
	logger.info(`Number ${number} set successfully`)
} else {
	logger.error(`Number ${number} not set`)
	logger.info(receipt)
}
