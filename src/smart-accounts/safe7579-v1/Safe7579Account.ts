import { ADDRESS } from '@/addresses'
import { Safe7579Launchpad__factory, SafeProxyFactory__factory } from '@/contract-types'
import { SendopError } from '@/error'
import { INTERFACES } from '@/interfaces'
import { sortAndUniquifyAddresses, zeroPadRight } from '@/utils'
import type { JsonRpcProvider } from 'ethers'
import { ZeroAddress } from 'ethers/constants'
import { concat } from 'ethers/utils'
import { ModularSmartAccount, type ModularSmartAccountOptions } from '../ModularSmartAccount'

export type Safe7579CreationOptions = {
	salt: string
	validatorAddress: string
	validatorInitData: string
	owners: string[]
	ownersThreshold: number
	attesters: string[]
	attestersThreshold: number
}

export type Safe7579AccountOptions = ModularSmartAccountOptions

export class Safe7579Account extends ModularSmartAccount {
	static override accountId() {
		return 'rhinestone.safe7579.v1.0.0'
	}

	constructor(options: Safe7579AccountOptions) {
		super(options)
	}

	override connect(address: string): Safe7579Account {
		return new Safe7579Account({
			...this._options,
			address,
		})
	}

	static getInitializer(creationOptions: Safe7579CreationOptions): string {
		const { validatorAddress, validatorInitData, owners, ownersThreshold, attesters, attestersThreshold } =
			creationOptions

		return INTERFACES.ISafe.encodeFunctionData('setup', [
			owners, // address[] calldata _owners
			ownersThreshold, // uint256 _threshold
			ADDRESS.Safe7579Launchpad,
			INTERFACES.Safe7579Launchpad.encodeFunctionData('addSafe7579', [
				ADDRESS.Safe7579,
				[
					{
						module: validatorAddress,
						initData: validatorInitData,
					},
				],
				[], // executors
				[], // fallbacks
				[], // hooks
				sortAndUniquifyAddresses(attesters),
				attestersThreshold,
			]),
			ADDRESS.Safe7579, // address fallbackHandler
			ZeroAddress, // address paymentToken
			0n, // uint256 payment
			ZeroAddress, // address payable paymentReceiver
		])
	}

	static override async computeAccountAddress(client: JsonRpcProvider, creationOptions: Safe7579CreationOptions) {
		const initializer = Safe7579Account.getInitializer(creationOptions)
		const launchpad = Safe7579Launchpad__factory.connect(ADDRESS.Safe7579Launchpad, client)

		return await launchpad.predictSafeAddress(
			ADDRESS.Safe,
			ADDRESS.SafeProxyFactory,
			await SafeProxyFactory__factory.connect(ADDRESS.SafeProxyFactory, client).proxyCreationCode(),
			creationOptions.salt,
			initializer,
		)

		// ===================== compute address without calling predictSafeAddress function =====================

		// const proxyCreationCode = await SafeProxyFactory__factory.connect(
		// 	ADDRESS.SafeProxyFactory,
		// 	client,
		// ).proxyCreationCode()
		// const deploymentData = concat([proxyCreationCode, zeroPadLeft(ADDRESS.Safe)])
		// const salt = keccak256(concat([keccak256(initializer), userSalt]))
		// const hash = keccak256(concat(['0xff', ADDRESS.SafeProxyFactory, salt, keccak256(deploymentData)]))
		// const computedAddress = getAddress(dataSlice(hash, 12))
	}

	override getInitCode(creationOptions: Safe7579CreationOptions): string {
		return concat([
			ADDRESS.SafeProxyFactory,
			INTERFACES.SafeProxyFactory.encodeFunctionData('createProxyWithNonce', [
				ADDRESS.Safe,
				Safe7579Account.getInitializer(creationOptions),
				creationOptions.salt,
			]),
		])
	}

	override getNonceKey(): bigint {
		return BigInt(zeroPadRight(this._options.validator.address(), 24))
	}

	// TODO: implement
	override encodeInstallModule(config: any): string {
		throw new Safe7579Error('Not implemented')
	}

	protected createError(message: string, cause?: Error) {
		return new Safe7579Error(message, cause)
	}
}

export class Safe7579Error extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'Safe7579Error'
	}
}
