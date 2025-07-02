import { ADDRESS } from '@/addresses'
import { sendop } from '@/sendop'
import { PimlicoPaymaster } from '@/paymasters'
import { KernelV3Account } from '@/smart-accounts'
import { randomBytes32 } from '@/utils'
import { EOAValidator } from '@/validators/EOAValidator'
import { getAddress, Interface, toNumber } from 'ethers'
import { getBundlerUrl, logger, setupCLI } from './utils'

/* 

bun run test/setNumber-pimlico.ts -r $sepolia -b pimlico
bun run test/setNumber-pimlico.ts -r $sepolia -b alchemy

*/

const { chainId, bundler, client, signer } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
	},
})

logger.info(`Chain ID: ${chainId}`)

const PIMLICO_SPONSORSHIP_POLICY_ID = process.env.PIMLICO_SPONSORSHIP_POLICY_ID
if (!PIMLICO_SPONSORSHIP_POLICY_ID) {
	throw new Error('PIMLICO_SPONSORSHIP_POLICY_ID is not set')
}

const number = Math.floor(Math.random() * 10000)
logger.info(`Setting number to ${number}`)

logger.info('Sending op...')
const creationOptions = {
	salt: randomBytes32(),
	validatorAddress: ADDRESS.ECDSAValidator,
	validatorInitData: signer.address,
}

logger.info(`salt: ${creationOptions.salt}`)

const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)
logger.info('computedAddress:', computedAddress)

const pmGetter = new PimlicoPaymaster({
	chainId,
	url: getBundlerUrl(chainId),
	sponsorshipPolicyId: PIMLICO_SPONSORSHIP_POLICY_ID,
})

const op = await sendop({
	bundler,
	executions: [
		{
			to: ADDRESS.Counter,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
			value: 0n,
		},
	],
	opGetter: new KernelV3Account({
		address: computedAddress,
		client,
		bundler,
		validator: new EOAValidator({
			address: ADDRESS.ECDSAValidator,
			signer,
		}),
	}),
	initCode: KernelV3Account.getInitCode(creationOptions),
	pmGetter,
})

const startTime = Date.now()
logger.info('Waiting for receipt...')
const receipt = await op.wait()
const duration = (Date.now() - startTime) / 1000 // Convert to seconds
logger.info(`Receipt received after ${duration.toFixed(2)} seconds`)

const log = receipt.logs.find(log => getAddress(log.address) === getAddress(ADDRESS.Counter))
if (log && toNumber(log.data) === number) {
	logger.info(`Number ${number} set successfully`)
} else {
	logger.error(`Number ${number} not set`)
	logger.info(receipt)
}
