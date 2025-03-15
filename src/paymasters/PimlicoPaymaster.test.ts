import ADDRESS from '@/addresses'
import { PimlicoBundler } from '@/bundlers'
import { sendop, type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/core'
import { KernelV3Account } from '@/smart-accounts'
import { ECDSAValidatorModule } from '@/validators'
import { hexlify, JsonRpcProvider, randomBytes, resolveAddress, Wallet } from 'ethers'
import { MyPaymaster, setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { PimlicoPaymaster } from './PimlicoPaymaster'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey, PIMLICO_SPONSORSHIP_POLICY_ID } = await setup({
	chainId: '11155111',
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
	let erc7579Validator: ERC7579Validator

	beforeAll(() => {
		client = new JsonRpcProvider(CLIENT_URL)
		signer = new Wallet(privateKey, client)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL)
		pmGetter = new MyPaymaster({
			client,
			paymasterAddress: ADDRESS.CharityPaymaster,
		})
		erc7579Validator = new ECDSAValidatorModule({
			address: ADDRESS.ECDSAValidator,
			client,
			signer,
		})

		logger.info(`Signer: ${signer.address}`)
	})

	it('should deploy kernel with pimlico paymaster', async () => {
		const creationOptions = {
			salt: hexlify(randomBytes(32)),
			validatorAddress: ADDRESS.ECDSAValidator,
			validatorInitData: await resolveAddress(signer),
		}

		const deployedAddress = await KernelV3Account.getNewAddress(client, creationOptions)

		const kernel = new KernelV3Account({
			address: deployedAddress,
			client: new JsonRpcProvider(CLIENT_URL),
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			erc7579Validator,
		})

		const op = await sendop({
			bundler: new PimlicoBundler(chainId, BUNDLER_URL),
			executions: [],
			opGetter: kernel,
			pmGetter: new PimlicoPaymaster({
				chainId,
				url: BUNDLER_URL,
				sponsorshipPolicyId: PIMLICO_SPONSORSHIP_POLICY_ID,
			}),
			initCode: kernel.getInitCode(creationOptions),
		})

		logger.info(`hash: ${op.hash}`)
		await op.wait()
		logger.info('deployed address: ', deployedAddress)

		const code = await client.getCode(deployedAddress)
		expect(code).not.toBe('0x')
	}, 100000)
})
