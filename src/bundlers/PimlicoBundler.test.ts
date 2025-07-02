import { ADDRESS } from '@/addresses'
import { sendop, type Bundler } from '@/sendop'
import { PublicPaymaster } from '@/paymasters'
import { KernelV3Account } from '@/smart-accounts'
import { randomBytes32 } from '@/utils'
import { EOAValidator } from '@/validators'
import { JsonRpcProvider, Wallet } from 'ethers'
import { setup } from 'test/utils'
import { beforeAll, describe, it } from 'vitest'
import { PimlicoBundler } from './PimlicoBundler'

const { logger, chainId, privateKey, CLIENT_URL, BUNDLER_URL } = await setup({
	chainId: 1337n,
})

logger.info(`Chain ID: ${chainId}`)

describe('PimlicoBundler', () => {
	let bundler: Bundler
	let client: JsonRpcProvider
	let signer: Wallet

	beforeAll(() => {
		bundler = new PimlicoBundler(chainId, BUNDLER_URL)
		client = new JsonRpcProvider(CLIENT_URL)
		signer = new Wallet(privateKey, client)
	})

	it('should deploy a kernel account', async () => {
		const creationOptions = {
			salt: randomBytes32(),
			validatorAddress: ADDRESS.ECDSAValidator,
			validatorInitData: signer.address,
		}

		logger.info(`salt: ${creationOptions.salt}`)

		const computedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)
		logger.info('computedAddress:', computedAddress)

		const op = await sendop({
			bundler,
			executions: [],
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
			pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
		})

		logger.info(`hash: ${op.hash}`)

		await op.wait()
		logger.info('deployed address:', computedAddress)
	}, 100_000)
})
