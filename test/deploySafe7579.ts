import { ADDRESS } from '@/addresses'
import {
	BICONOMY_ATTESTER_ADDRESS,
	PublicPaymaster,
	randomBytes32,
	RHINESTONE_ATTESTER_ADDRESS,
	Safe7579Account,
	sendop,
	type Safe7579CreationOptions,
} from '@/index'
import { OwnableValidator } from '@/validators/OwnableValidator'
import { logger } from './utils'
import { setupCLI } from './utils/cli'
import { Interface } from 'ethers'

const { signer, bundler, client } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
	},
})

const salt = randomBytes32()

const creationOptions: Safe7579CreationOptions = {
	salt,
	validatorAddress: ADDRESS.OwnableValidator,
	validatorInitData: OwnableValidator.getInitData([signer.address], 1),
	owners: [signer.address],
	ownersThreshold: 1,
	attesters: [RHINESTONE_ATTESTER_ADDRESS, BICONOMY_ATTESTER_ADDRESS],
	attestersThreshold: 1,
}
logger.info(`salt: ${creationOptions.salt}`)

const computedAddress = await Safe7579Account.computeAccountAddress(client, creationOptions)
logger.info('computedAddress:', computedAddress)

const safe7579 = new Safe7579Account({
	address: computedAddress,
	client,
	bundler,
	validator: new OwnableValidator({ signers: [signer] }),
})

const number = Math.floor(Math.random() * 1000000)

const op = await sendop({
	bundler,
	executions: [
		{
			to: ADDRESS.Counter,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
			value: 0n,
		},
	],
	opGetter: safe7579,
	initCode: safe7579.getInitCode(creationOptions),
	pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
})

logger.info(`hash: ${op.hash}`)

const receipt = await op.wait()
logger.info('deployed address:', computedAddress)
logger.info('receipt:', JSON.stringify(receipt, null, 2))
