import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import {
	EntryPointV07__factory,
	ERC4337Bundler,
	getEmptyUserOp,
	getUserOpHash,
	type UserOperationReceipt,
} from 'ethers-erc4337'
import { fetchGasPriceAlchemy } from '@/fetchGasPrice'
import { KernelValidationMode, KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { randomBytes32, zeroBytes } from '@/utils'
import type { EthersError } from 'ethers'
import { concat, Contract, hexlify, Interface, isError, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'

const KERNEL_V3_3_FACTORY = '0x2577507b78c2008Ff367261CB6285d44ba5eF2E9'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', dev7702 = '', dev7702pk = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}
if (!dev7702) {
	throw new Error('dev7702 is not set')
}

const CHAIN_ID = 11155111

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)
const entryPointAddress = ADDRESS.EntryPointV07
const entryPoint = EntryPointV07__factory.connect(entryPointAddress, client)

const entryPoints = await bundler.supportedEntryPoints()
console.log('entryPoints', entryPoints)

const salt = randomBytes32()

console.log('salt', salt)

const KERNEL_V3_3_FACTORY_ABI = [
	'function getAddress(bytes calldata data, bytes32 salt) public view returns (address)',
	'function createAccount(bytes calldata data, bytes32 salt) public payable returns (address)',
]

const KERNEL_V3_3_ABI = [
	'function initialize(bytes21 _rootValidator, address hook, bytes calldata validatorData, bytes calldata hookData, bytes[] calldata initConfig) external',
]

const kernelFactory = new Contract(KERNEL_V3_3_FACTORY, KERNEL_V3_3_FACTORY_ABI, client)

const initializeData = new Interface(KERNEL_V3_3_ABI).encodeFunctionData('initialize', [
	concat([KernelValidationType.VALIDATOR, ADDRESS.ECDSAValidator]),
	ZeroAddress,
	dev7702,
	'0x',
	[],
])

const factoryData = new Interface(KERNEL_V3_3_FACTORY_ABI).encodeFunctionData('createAccount', [initializeData, salt])

const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

console.log('accountAddress', accountAddress)

const userOp = getEmptyUserOp()

userOp.sender = accountAddress
userOp.factory = KERNEL_V3_3_FACTORY
userOp.factoryData = factoryData

// get nonce by nonceKey

const nonceKey = getNonceKey(ADDRESS.ECDSAValidator)
const nonce = await entryPoint.getNonce(accountAddress, nonceKey)

function getNonceKey(validatorAddress: string) {
	const defaultOptions = {
		mode: KernelValidationMode.DEFAULT,
		type: KernelValidationType.ROOT,
		identifier: validatorAddress,
		key: zeroBytes(2),
	}
	const { mode, type, identifier, key } = defaultOptions
	return BigInt(concat([mode, type, identifier, key]))
}

userOp.nonce = nonce

// set paymaster
userOp.paymaster = ADDRESS.PublicPaymaster
userOp.paymasterData = '0x'

// set callData
userOp.callData = '0x'

// set signature
userOp.signature = DUMMY_ECDSA_SIGNATURE

// estimate gas

const { maxFeePerGas, maxPriorityFeePerGas } = await fetchGasPriceAlchemy(client)

userOp.maxFeePerGas = maxFeePerGas
userOp.maxPriorityFeePerGas = maxPriorityFeePerGas

try {
	const estimations = await bundler.estimateUserOperationGas(userOp, entryPointAddress)

	userOp.verificationGasLimit = estimations.verificationGasLimit
	userOp.preVerificationGas = estimations.preVerificationGas
	userOp.callGasLimit = estimations.callGasLimit
	userOp.paymasterVerificationGasLimit = estimations.paymasterVerificationGasLimit
} catch (e: unknown) {
	if (isError(e, (e as EthersError).code)) {
		console.error(e.error?.message)

		// if ('payload' in e) {
		// 	console.log('UserOp:', e.payload)
		// }
	} else {
		console.error(e)
	}
	process.exit(1)
}

// sign userOpHash

const hash = getUserOpHash(userOp, entryPointAddress, CHAIN_ID)
console.log('userOpHash', hexlify(hash))

const wallet = new Wallet(dev7702pk)
const signature = await wallet.signMessage(hash)

userOp.signature = signature

// send
try {
	await bundler.sendUserOperation(userOp, entryPointAddress)
	console.log('sent')
} catch (e: unknown) {
	if (isError(e, (e as EthersError).code)) {
		console.error(e.error?.message)

		// if ('payload' in e) {
		// 	console.log('UserOp:', e.payload)
		// }
	} else {
		console.error(e)
	}
}

// wait for receipt
let receipt: UserOperationReceipt | null = null
while (receipt === null) {
	receipt = await bundler.getUserOperationReceipt(hexlify(hash))
	if (receipt === null) {
		await new Promise(resolve => setTimeout(resolve, 1000))
	}
}

console.log('receipt', receipt)
console.log('success', receipt.success)
