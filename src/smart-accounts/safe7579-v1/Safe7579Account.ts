import { ADDRESS } from '@/addresses'
import { Safe7579Launchpad__factory, SafeProxyFactory__factory } from '@/contract-types'
import { ERC7579_MODULE_TYPE, type Execution, type PaymasterGetter, type SendOpResult } from '@/core'
import { INTERFACES } from '@/interfaces'
import { SendopError } from '@/error'
import type { JsonRpcProvider } from 'ethers'
import { ZeroAddress } from 'ethers/constants'
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

	get interface() {
		return INTERFACES.ISafe7579
	}

	constructor(options: Safe7579AccountOptions) {
		super(options)
	}

	override connect(address: string): ModularSmartAccount {
		return new Safe7579Account({
			...this._options,
			address,
		})
	}

	static override async getNewAddress(client: JsonRpcProvider, creationOptions: Safe7579CreationOptions) {
		const {
			salt: userSalt,
			validatorAddress,
			validatorInitData,
			owners,
			ownersThreshold,
			attesters,
			attestersThreshold,
		} = creationOptions

		const initializer = INTERFACES.ISafe.encodeFunctionData('setup', [
			owners, // address[] calldata _owners
			ownersThreshold, // uint256 _threshold
			ADDRESS.Safe7579Launchpad,
			INTERFACES.Safe7579Launchpad.encodeFunctionData('addSafe7579', [
				ADDRESS.Safe7579,
				[
					{
						module: validatorAddress,
						initData: validatorInitData,
						moduleType: ERC7579_MODULE_TYPE.VALIDATOR,
					},
				],
				attesters, // attesters
				attestersThreshold, // attestation threshold
			]),
			ADDRESS.Safe7579, // address fallbackHandler
			ZeroAddress, // address paymentToken
			0n, // uint256 payment
			ZeroAddress, // address payable paymentReceiver
		])

		const launchpad = Safe7579Launchpad__factory.connect(ADDRESS.Safe7579Launchpad, client)

		return await launchpad.predictSafeAddress(
			ADDRESS.Safe,
			ADDRESS.SafeProxyFactory,
			await SafeProxyFactory__factory.connect(ADDRESS.SafeProxyFactory, client).proxyCreationCode(),
			userSalt,
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

	protected createError(message: string) {
		return new Safe7579Error(message)
	}

	override getNonceKey(): bigint {
		return 0n
	}

	override getCallData(executions: Execution[]): Promise<string> | string {
		return ''
	}

	override async deploy(creationOptions: any, pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		return '' as any
	}
	override send(executions: Execution[], pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		return '' as any
	}

	override getInitCode(creationOptions: any): string {
		return ''
	}

	override encodeInstallModule(config: any): string {
		return ''
	}
}

export class Safe7579Error extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'Safe7579Error'
	}
}
