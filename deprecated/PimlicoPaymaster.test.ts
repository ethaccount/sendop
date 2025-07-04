import { ADDRESS } from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { sendop, type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/sendop'
import { KernelV3Account } from '@/smart-accounts'
import { EOAValidator } from '@/validators'
import { hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { PimlicoPaymaster } from '../src/paymasters/PimlicoPaymaster'
import { DeprecatedPublicPaymaster } from './DeprecatedPublicPaymaster'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey, PIMLICO_SPONSORSHIP_POLICY_ID } = await setup({
	chainId: 11155111n,
})

if (!PIMLICO_SPONSORSHIP_POLICY_ID) {
	throw new Error('PIMLICO_SPONSORSHIP_POLICY_ID is not set')
}

logger.info(`Chain ID: ${chainId}`)

describe.skip('PimlicoPaymaster', () => {
	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: Bundler
	let pmGetter: PaymasterGetter
	let validator: ERC7579Validator

	beforeAll(() => {
		client = new JsonRpcProvider(CLIENT_URL)
		signer = new Wallet(privateKey, client)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL)
		pmGetter = new DeprecatedPublicPaymaster(ADDRESS.PublicPaymaster)
		validator = new EOAValidator({
			address: ADDRESS.ECDSAValidator,
			signer,
		})

		logger.info(`Signer: ${signer.address}`)
	})

	it('should deploy kernel with pimlico paymaster', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			validatorInitData: signer.address,
		}

		const deployedAddress = await KernelV3Account.computeAccountAddress(client, creationOptions)

		const kernel = new KernelV3Account({
			address: deployedAddress,
			client,
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			validator,
		})

		const op = await sendop({
			initCode: kernel.getInitCode(creationOptions),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [],
			opGetter: new KernelV3Account({
				address: deployedAddress,
				client,
				bundler: new PimlicoBundler(chainId, BUNDLER_URL),
				validator,
			}),
			pmGetter: new PimlicoPaymaster({
				chainId,
				url: bundler.url,
				sponsorshipPolicyId: PIMLICO_SPONSORSHIP_POLICY_ID,
			}),
		})

		logger.info(`hash: ${op.hash}`)
		await op.wait()
		logger.info('deployed address: ', deployedAddress)

		const code = await client.getCode(deployedAddress)
		expect(code).not.toBe('0x')
	}, 100000)
})
