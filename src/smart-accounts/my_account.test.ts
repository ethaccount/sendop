import { type Bundler, type ERC7579Validator, type PaymasterGetter } from '@/core'
import { ECDSAValidatorModule } from '@/validators/ECDSAValidatorModule'
import { JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { MyPaymaster, setup } from 'test/utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { MyAccount } from './my_account'
import { PimlicoBundler } from '@/bundlers/PimlicoBundler'
import ADDRESS from '@/addresses'

const { logger, chainId, CLIENT_URL, BUNDLER_URL, privateKey } = await setup()

logger.info(`Chain ID: ${chainId}`)

describe.skip('MyAccount', () => {
	let signer: Wallet
	let client: JsonRpcProvider
	let bundler: Bundler
	let erc7579Validator: ERC7579Validator
	let pmGetter: PaymasterGetter
	let myAccount: MyAccount

	beforeAll(() => {
		signer = new Wallet(privateKey)
		client = new JsonRpcProvider(CLIENT_URL)
		bundler = new PimlicoBundler(chainId, BUNDLER_URL)
		erc7579Validator = new ECDSAValidatorModule({
			address: ADDRESS.ECDSAValidator,
			client,
			signer: new Wallet(privateKey),
		})
		pmGetter = new MyPaymaster({
			client,
			paymasterAddress: ADDRESS.CharityPaymaster,
		})

		// TODO:
		myAccount = new MyAccount('', {
			client,
			bundler,
			erc7579Validator,
			pmGetter,
		})
		logger.info(`Signer: ${signer.address}`)
	})

	describe('static methods', () => {
		it('should get accountId', () => {
			expect(MyAccount.accountId()).toBe('johnson86tw.0.0.1')
		})
		it('should getNewAddress', async () => {
			const newAddress = await MyAccount.getNewAddress(client, {
				salt: '0x1234567890',
				validatorAddress: ADDRESS.ECDSAValidator,
				owner: signer.address,
			})
			expect(newAddress).not.toBe(ZeroAddress)
		})
	})
})
