import { KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { randomBytes32 } from '@/utils'
import { concat, Contract, Interface, JsonRpcProvider, ZeroAddress } from 'ethers'

const KERNEL_V3_3_FACTORY_ADDRESS = '0x2577507b78c2008Ff367261CB6285d44ba5eF2E9'

export async function computeAddress(
	client: JsonRpcProvider,
	validatorAddress: string,
	validatorData: string,
	salt: string = randomBytes32(),
): Promise<{
	factory: string
	factoryData: string
	accountAddress: string
}> {
	const KERNEL_V3_3_FACTORY_ABI = [
		'function getAddress(bytes calldata data, bytes32 salt) public view returns (address)',
		'function createAccount(bytes calldata data, bytes32 salt) public payable returns (address)',
	]

	const KERNEL_V3_3_ABI = [
		'function initialize(bytes21 _rootValidator, address hook, bytes calldata validatorData, bytes calldata hookData, bytes[] calldata initConfig) external',
	]

	const initializeData = new Interface(KERNEL_V3_3_ABI).encodeFunctionData('initialize', [
		concat([KernelValidationType.VALIDATOR, validatorAddress]),
		ZeroAddress,
		validatorData,
		'0x',
		[],
	])

	const factoryData = new Interface(KERNEL_V3_3_FACTORY_ABI).encodeFunctionData('createAccount', [
		initializeData,
		salt,
	])

	const kernelFactory = new Contract(KERNEL_V3_3_FACTORY_ADDRESS, KERNEL_V3_3_FACTORY_ABI, client)
	const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

	return { factory: KERNEL_V3_3_FACTORY_ADDRESS, factoryData, accountAddress }
}
