import { randomBytes32 } from '@/utils'
import type { BigNumberish } from 'ethers'
import { concat, Contract, Interface, JsonRpcProvider, ZeroAddress } from 'ethers'
import { encodeInstallModule } from './api/encodeInstallModule'
import { encodeUninstallModule } from './api/encodeUninstallModule'
import { getNonceKey } from './api/getNonceKey'
import { sign1271 } from './api/sign1271'
import { KernelValidationType, type KernelInstallModuleConfig, type KernelUninstallModuleConfig } from './types'

export class KernelAPI {
	static implementationAddress = '0xd6CEDDe84be40893d153Be9d467CD6aD37875b28'
	static factoryAddress = '0x2577507b78c2008Ff367261CB6285d44ba5eF2E9'

	static executeSelector = '0xe9ae5c53'

	// https://github.com/zerodevapp/kernel/blob/v3.3/src/factory/KernelFactory.sol
	static factoryInterface = new Interface([
		'function getAddress(bytes calldata data, bytes32 salt) public view returns (address)',
		'function createAccount(bytes calldata data, bytes32 salt) public payable returns (address)',
	])

	// https://github.com/zerodevapp/kernel/blob/v3.3/src/Kernel.sol
	static accountInterface = new Interface([
		'function initialize(bytes21 _rootValidator, address hook, bytes calldata validatorData, bytes calldata hookData, bytes[] calldata initConfig) external',
	])

	static async getDeployment({
		client,
		validatorAddress,
		validatorData,
		salt = randomBytes32(),
	}: {
		client: JsonRpcProvider
		validatorAddress: string
		validatorData: string
		salt?: string
	}) {
		const initializeData = KernelAPI.accountInterface.encodeFunctionData('initialize', [
			concat([KernelValidationType.VALIDATOR, validatorAddress]),
			ZeroAddress,
			validatorData,
			'0x',
			[],
		])

		const factoryData = KernelAPI.factoryInterface.encodeFunctionData('createAccount', [initializeData, salt])

		const kernelFactory = new Contract(KernelAPI.factoryAddress, KernelAPI.factoryInterface, client)
		const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

		return { factory: KernelAPI.factoryAddress, factoryData, accountAddress }
	}

	static getNonceKey(validatorAddress: string) {
		return getNonceKey(validatorAddress)
	}

	static async sign1271({
		hash,
		version = '0.3.3',
		validator,
		chainId,
		accountAddress,
		signHash,
	}: {
		hash: Uint8Array
		version: '0.3.3' | '0.3.1'
		validator: string
		chainId: BigNumberish
		accountAddress: string
		signHash: (hash: Uint8Array) => Promise<string>
	}) {
		return await sign1271({ version, validator, hash, chainId, accountAddress, signHash })
	}

	static encodeInstallModule(config: KernelInstallModuleConfig): string {
		return encodeInstallModule(config)
	}

	static encodeUninstallModule(config: KernelUninstallModuleConfig): string {
		return encodeUninstallModule(config)
	}
}
