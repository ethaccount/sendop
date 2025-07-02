import { ADDRESS } from '@/addresses'
import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { SendopError } from '@/error'
import { INTERFACES } from '@/interfaces'
import { abiEncode, connectEntryPointV07, isBytes, isBytes32, zeroBytes } from '@/utils'
import { concat, Contract, hexlify, JsonRpcProvider, toBeHex, ZeroAddress } from 'ethers'
import { ModularSmartAccount, type ModularSmartAccountOptions } from '../ModularSmartAccount'
import type { KernelCreationOptions, KernelInstallModuleConfig, KernelUninstallModuleConfig } from './types'
import { KernelValidationMode, KernelValidationType } from './types'

export type KernelV3AccountOptions = ModularSmartAccountOptions & KernelV3AccountConfig

export type KernelV3AccountConfig = {
	nonce?: {
		mode?: KernelValidationMode // 1 byte
		type?: KernelValidationType // 1 byte
		identifier?: string // 20 bytes
		key?: string // 2 bytes
	}
}

export class KernelV3Account extends ModularSmartAccount<KernelCreationOptions> {
	private readonly _kernelConfig: KernelV3AccountConfig | undefined

	static override accountId() {
		return 'kernel.advanced.v0.3.1'
	}

	constructor(options: KernelV3AccountOptions) {
		super(options)
		const { nonce } = options
		this._kernelConfig = { nonce }
	}

	override connect(address: string): KernelV3Account {
		return new KernelV3Account({
			...this._options,
			address,
		})
	}

	override getInitCode(creationOptions: KernelCreationOptions): string {
		return KernelV3Account.getInitCode(creationOptions)
	}

	static getInitCode(creationOptions: KernelCreationOptions) {
		const { salt } = creationOptions
		if (!isBytes32(salt)) {
			throw new KernelError('Invalid salt')
		}
		return concat([
			ADDRESS.KernelV3Factory,
			INTERFACES.KernelV3Factory.encodeFunctionData('createAccount', [
				KernelV3Account.encodeInitialize(creationOptions),
				salt,
			]),
		])
	}

	static override async computeAccountAddress(client: JsonRpcProvider, creationOptions: KernelCreationOptions) {
		const { salt } = creationOptions
		if (!isBytes32(salt)) {
			throw new KernelError('Invalid salt')
		}
		const kernelFactory = new Contract(ADDRESS.KernelV3Factory, INTERFACES.KernelV3Factory, client)
		return (await kernelFactory['getAddress(bytes,bytes32)'](
			KernelV3Account.encodeInitialize(creationOptions),
			salt,
		)) as string
	}

	override async getNonce() {
		return await connectEntryPointV07(this.client).getNonce(
			this.getSender(),
			this.getNonceKey(this._kernelConfig?.nonce),
		)
	}

	async getCustomNonce(options: {
		mode?: KernelValidationMode
		type?: KernelValidationType
		identifier?: string
		key?: string
	}) {
		const nonce = await connectEntryPointV07(this.client).getNonce(
			this.getSender(),
			this.getNonceKey({
				...this._kernelConfig?.nonce,
				...options,
			}),
		)
		return toBeHex(nonce)
	}

	/**
	 * @dev 1byte mode  | 1byte type | 20bytes identifierWithoutType | 2byte nonceKey = 24 bytes nonceKey
	 * @param options default value is { mode: KernelValidationMode.DEFAULT, type: KernelValidationType.ROOT, identifierWithoutType: this.validator.address(), key: zeroBytes(2) }
	 * @returns hex string
	 */
	override getNonceKey(options?: {
		mode?: KernelValidationMode
		type?: KernelValidationType
		identifier?: string
		key?: string
	}): bigint {
		const defaultOptions = {
			mode: KernelValidationMode.DEFAULT,
			type: KernelValidationType.ROOT,
			identifier: this.validator.address(),
			key: zeroBytes(2),
		}
		const { mode, type, identifier, key } = { ...defaultOptions, ...options }
		return BigInt(hexlify(concat([mode, type, identifier, key])))
	}

	encodeInitialize(creationOptions: KernelCreationOptions) {
		return KernelV3Account.encodeInitialize(creationOptions)
	}

	static encodeInitialize(creationOptions: KernelCreationOptions) {
		const { validatorAddress, validatorInitData, hookAddress, hookData, initConfig } = creationOptions

		const rootValidator = concat([KernelValidationType.VALIDATOR, validatorAddress])
		if (!isBytes(rootValidator, 21)) {
			throw new KernelError('Invalid rootValidator')
		}
		return INTERFACES.KernelV3.encodeFunctionData('initialize', [
			rootValidator,
			hookAddress ?? ZeroAddress,
			validatorInitData,
			hookData ?? '0x',
			initConfig ?? [],
		])
	}

	static override encodeInstallModule(config: KernelInstallModuleConfig): string {
		let initData: string

		switch (config.moduleType) {
			case ERC7579_MODULE_TYPE.VALIDATOR:
				{
					// default values
					const hookAddress = config.hookAddress ?? ZeroAddress
					const hookData = config.hookData ?? '0x'
					const selectorData = config.selectorData ?? '0x'

					initData = concat([
						hookAddress,
						abiEncode(['bytes', 'bytes', 'bytes'], [config.initData, hookData, selectorData]),
					])
				}
				break

			case ERC7579_MODULE_TYPE.EXECUTOR:
				{
					// default values
					const hookAddress = config.hookAddress ?? ZeroAddress
					const hookData = config.hookData ?? '0x'
					initData = concat([hookAddress, abiEncode(['bytes', 'bytes'], [config.initData, hookData])])
				}
				break

			case ERC7579_MODULE_TYPE.FALLBACK:
				initData = concat([
					config.selector,
					config.hookAddress,
					abiEncode(['bytes', 'bytes'], [config.selectorData, config.hookData]),
				])
				break

			case ERC7579_MODULE_TYPE.HOOK:
				initData = config.initData
				break

			default:
				throw new KernelError('Unsupported module type')
		}

		return INTERFACES.KernelV3.encodeFunctionData('installModule', [
			config.moduleType,
			config.moduleAddress,
			initData,
		])
	}

	static override encodeUninstallModule(config: KernelUninstallModuleConfig): string {
		let deInitData: string
		switch (config.moduleType) {
			case ERC7579_MODULE_TYPE.VALIDATOR:
				deInitData = config.deInitData
				break

			case ERC7579_MODULE_TYPE.EXECUTOR:
				deInitData = config.deInitData
				break
			default:
				// TODO: implement other module types
				throw new KernelError('Unsupported module type')
		}

		return INTERFACES.KernelV3.encodeFunctionData('uninstallModule', [
			config.moduleType,
			config.moduleAddress,
			deInitData,
		])
	}

	protected createError(message: string, cause?: Error) {
		return new KernelError(message, cause)
	}
}

export class KernelError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'KernelError'
	}
}
