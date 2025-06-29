# Refactor script with builder pattern
_Exported on 2025/6/29 at 00:12:55 [GMT+8] from Cursor (1.1.6)_

---

**User**

Can you try to refactor this script with the builder pattern for user operation builder? 

---

**Cursor**

I'll refactor this script using a builder pattern to make the user operation construction more readable and maintainable. Let me create a `UserOperationBuilder` class and refactor the code:

```typescript:test/ethers-erc4337/deploy-kernel.ts
import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { KernelValidationMode, KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { randomBytes32, zeroBytes } from '@/utils'
import type { EthersError } from 'ethers'
import { concat, Contract, hexlify, Interface, isError, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { EntryPointV07__factory, ERC4337Bundler, getEmptyUserOp, getUserOpHash, UserOperation } from 'ethers-erc4337'
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

class UserOperationBuilder {
	private userOp: UserOperation
	private bundler: ERC4337Bundler
	private client: JsonRpcProvider
	private entryPointAddress: string
	private chainId: number

	constructor(bundler: ERC4337Bundler, client: JsonRpcProvider, entryPointAddress: string, chainId: number) {
		this.userOp = getEmptyUserOp()
		this.bundler = bundler
		this.client = client
		this.entryPointAddress = entryPointAddress
		this.chainId = chainId
	}

	setSender(sender: string): UserOperationBuilder {
		this.userOp.sender = sender
		return this
	}

	setFactory(factory: string, factoryData: string): UserOperationBuilder {
		this.userOp.factory = factory
		this.userOp.factoryData = factoryData
		return this
	}

	setNonce(nonce: bigint): UserOperationBuilder {
		this.userOp.nonce = nonce
		return this
	}

	setPaymaster(paymaster: string, paymasterData: string = '0x', paymasterPostOpGasLimit: number = 0): UserOperationBuilder {
		this.userOp.paymaster = paymaster
		this.userOp.paymasterData = paymasterData
		this.userOp.paymasterPostOpGasLimit = paymasterPostOpGasLimit
		return this
	}

	setCallData(callData: string): UserOperationBuilder {
		this.userOp.callData = callData
		return this
	}

	setSignature(signature: string): UserOperationBuilder {
		this.userOp.signature = signature
		return this
	}

	async setFeeData(): Promise<UserOperationBuilder> {
		const { maxFeePerGas, maxPriorityFeePerGas } = await this.client.getFeeData()
		if (!maxFeePerGas || !maxPriorityFeePerGas) {
			throw new Error('Failed to get fee data')
		}

		this.userOp.maxFeePerGas = maxFeePerGas
		this.userOp.maxPriorityFeePerGas = maxPriorityFeePerGas
		return this
	}

	async estimateGas(): Promise<UserOperationBuilder> {
		try {
			const estimations = await this.bundler.estimateUserOperationGas(this.userOp, this.entryPointAddress)

			this.userOp.verificationGasLimit = estimations.verificationGasLimit
			this.userOp.preVerificationGas = estimations.preVerificationGas
			this.userOp.callGasLimit = estimations.callGasLimit
			this.userOp.paymasterVerificationGasLimit = estimations.paymasterVerificationGasLimit
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			process.exit(1)
		}
		return this
	}

	async signWithWallet(privateKey: string): Promise<UserOperationBuilder> {
		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		console.log('userOpHash', hexlify(hash))

		const wallet = new Wallet(privateKey)
		const signature = await wallet.signMessage(hash)
		this.userOp.signature = signature
		return this
	}

	getUserOperation(): UserOperation {
		return { ...this.userOp }
	}

	async execute(): Promise<void> {
		try {
			await this.bundler.sendUserOperation(this.userOp, this.entryPointAddress)
			console.log('sent')
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			return
		}

		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		const receipt = await this.bundler.waitForReceipt(hexlify(hash))

		console.log('receipt', receipt)
		console.log('success', receipt.success)
	}
}

// Main execution using the builder pattern
async function main() {
	const { accountAddress, factory, factoryData } = await getKernelAddress(ADDRESS.ECDSAValidator, dev7702)
	const nonce = await getKernelNonce(accountAddress, ADDRESS.ECDSAValidator)

	await new UserOperationBuilder(bundler, client, entryPointAddress, CHAIN_ID)
		.setSender(accountAddress)
		.setFactory(factory, factoryData)
		.setNonce(nonce)
		.setPaymaster(ADDRESS.PublicPaymaster)
		.setCallData('0x')
		.setSignature(DUMMY_ECDSA_SIGNATURE)
		.setFeeData()
		.then(builder => builder.estimateGas())
		.then(builder => builder.signWithWallet(dev7702pk))
		.then(builder => builder.execute())
}

main().catch(console.error)

async function getKernelAddress(
	validatorAddress: string,
	validatorData: string,
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

	const salt = randomBytes32()

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

	const kernelFactory = new Contract(KERNEL_V3_3_FACTORY, KERNEL_V3_3_FACTORY_ABI, client)
	const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

	return { factory: KERNEL_V3_3_FACTORY, factoryData, accountAddress }
}

async function getKernelNonce(accountAddress: string, validatorAddress: string) {
	const defaultOptions = {
		mode: KernelValidationMode.DEFAULT,
		type: KernelValidationType.ROOT,
		identifier: validatorAddress,
		key: zeroBytes(2),
	}
	const { mode, type, identifier, key } = defaultOptions
	const nonceKey = BigInt(concat([mode, type, identifier, key]))

	return await entryPoint.getNonce(accountAddress, nonceKey)
}
```

## Key improvements with the Builder Pattern:

1. **Fluent Interface**: Chain method calls for readable configuration
2. **Encapsulation**: All user operation logic contained within the builder
3. **Reusability**: Builder can be easily reused for different operations
4. **Error Handling**: Centralized error handling within builder methods
5. **Separation of Concerns**: Clear separation between setup, estimation, signing, and execution
6. **Type Safety**: Full TypeScript support with proper typing

The builder pattern makes the code much more readable and maintainable. Each step is explicit and the flow is clear: setup → estimate gas → sign → execute.

```typescript
import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { KernelValidationMode, KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { randomBytes32, zeroBytes } from '@/utils'
import type { EthersError } from 'ethers'
import { concat, Contract, hexlify, Interface, isError, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { EntryPointV07__factory, ERC4337Bundler, getEmptyUserOp, getUserOpHash, UserOperation } from 'ethers-erc4337'
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

class UserOperationBuilder {
	private userOp: UserOperation
	private bundler: ERC4337Bundler
	private client: JsonRpcProvider
	private entryPointAddress: string
	private chainId: number

	constructor(bundler: ERC4337Bundler, client: JsonRpcProvider, entryPointAddress: string, chainId: number) {
		this.userOp = getEmptyUserOp()
		this.bundler = bundler
		this.client = client
		this.entryPointAddress = entryPointAddress
		this.chainId = chainId
	}

	setSender(sender: string): UserOperationBuilder {
		this.userOp.sender = sender
		return this
	}

	setFactory(factory: string, factoryData: string): UserOperationBuilder {
		this.userOp.factory = factory
		this.userOp.factoryData = factoryData
		return this
	}

	setNonce(nonce: bigint): UserOperationBuilder {
		this.userOp.nonce = nonce
		return this
	}

	setPaymaster(paymaster: string, paymasterData: string = '0x', paymasterPostOpGasLimit: number = 0): UserOperationBuilder {
		this.userOp.paymaster = paymaster
		this.userOp.paymasterData = paymasterData
		this.userOp.paymasterPostOpGasLimit = paymasterPostOpGasLimit
		return this
	}

	setCallData(callData: string): UserOperationBuilder {
		this.userOp.callData = callData
		return this
	}

	setSignature(signature: string): UserOperationBuilder {
		this.userOp.signature = signature
		return this
	}

	async setFeeData(): Promise<UserOperationBuilder> {
		const { maxFeePerGas, maxPriorityFeePerGas } = await this.client.getFeeData()
		if (!maxFeePerGas || !maxPriorityFeePerGas) {
			throw new Error('Failed to get fee data')
		}

		this.userOp.maxFeePerGas = maxFeePerGas
		this.userOp.maxPriorityFeePerGas = maxPriorityFeePerGas
		return this
	}

	async estimateGas(): Promise<UserOperationBuilder> {
		try {
			const estimations = await this.bundler.estimateUserOperationGas(this.userOp, this.entryPointAddress)

			this.userOp.verificationGasLimit = estimations.verificationGasLimit
			this.userOp.preVerificationGas = estimations.preVerificationGas
			this.userOp.callGasLimit = estimations.callGasLimit
			this.userOp.paymasterVerificationGasLimit = estimations.paymasterVerificationGasLimit
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			process.exit(1)
		}
		return this
	}

	async signWithWallet(privateKey: string): Promise<UserOperationBuilder> {
		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		console.log('userOpHash', hexlify(hash))

		const wallet = new Wallet(privateKey)
		const signature = await wallet.signMessage(hash)
		this.userOp.signature = signature
		return this
	}

	getUserOperation(): UserOperation {
		return { ...this.userOp }
	}

	async execute(): Promise<void> {
		try {
			await this.bundler.sendUserOperation(this.userOp, this.entryPointAddress)
			console.log('sent')
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			return
		}

		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		const receipt = await this.bundler.waitForReceipt(hexlify(hash))

		console.log('receipt', receipt)
		console.log('success', receipt.success)
	}
}

// Main execution using the builder pattern
async function main() {
	const { accountAddress, factory, factoryData } = await getKernelAddress(ADDRESS.ECDSAValidator, dev7702)
	const nonce = await getKernelNonce(accountAddress, ADDRESS.ECDSAValidator)

	await new UserOperationBuilder(bundler, client, entryPointAddress, CHAIN_ID)
		.setSender(accountAddress)
		.setFactory(factory, factoryData)
		.setNonce(nonce)
		.setPaymaster(ADDRESS.PublicPaymaster)
		.setCallData('0x')
		.setSignature(DUMMY_ECDSA_SIGNATURE)
		.setFeeData()
		.then(builder => builder.estimateGas())
		.then(builder => builder.signWithWallet(dev7702pk))
		.then(builder => builder.execute())
}

main().catch(console.error)

async function getKernelAddress(
	validatorAddress: string,
	validatorData: string,
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

	const salt = randomBytes32()

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

	const kernelFactory = new Contract(KERNEL_V3_3_FACTORY, KERNEL_V3_3_FACTORY_ABI, client)
	const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

	return { factory: KERNEL_V3_3_FACTORY, factoryData, accountAddress }
}

async function getKernelNonce(accountAddress: string, validatorAddress: string) {
	const defaultOptions = {
		mode: KernelValidationMode.DEFAULT,
		type: KernelValidationType.ROOT,
		identifier: validatorAddress,
		key: zeroBytes(2),
	}
	const { mode, type, identifier, key } = defaultOptions
	const nonceKey = BigInt(concat([mode, type, identifier, key]))

	return await entryPoint.getNonce(accountAddress, nonceKey)
}
```

---

**User**

setFeeData()
		.then(builder => builder.estimateGas())
		.then(builder => builder.signWithWallet(dev7702pk))
		.then(builder => builder.execute())

I found these method is promise, and it made me confused from between the set method and the promise. Can you make it cleaner by separating these two kinds of methods in the userOpBuilder?

---

**Cursor**

You're absolutely right! Mixing synchronous setters with async methods in the fluent chain is confusing. Let me refactor this to clearly separate synchronous configuration methods from asynchronous operations:

```typescript:test/ethers-erc4337/deploy-kernel.ts
import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { KernelValidationMode, KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { randomBytes32, zeroBytes } from '@/utils'
import type { EthersError } from 'ethers'
import { concat, Contract, hexlify, Interface, isError, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { EntryPointV07__factory, ERC4337Bundler, getEmptyUserOp, getUserOpHash, UserOperation } from 'ethers-erc4337'
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

class UserOperationBuilder {
	private userOp: UserOperation
	private bundler: ERC4337Bundler
	private client: JsonRpcProvider
	private entryPointAddress: string
	private chainId: number

	constructor(bundler: ERC4337Bundler, client: JsonRpcProvider, entryPointAddress: string, chainId: number) {
		this.userOp = getEmptyUserOp()
		this.bundler = bundler
		this.client = client
		this.entryPointAddress = entryPointAddress
		this.chainId = chainId
	}

	// Synchronous configuration methods (fluent)
	setSender(sender: string): UserOperationBuilder {
		this.userOp.sender = sender
		return this
	}

	setFactory(factory: string, factoryData: string): UserOperationBuilder {
		this.userOp.factory = factory
		this.userOp.factoryData = factoryData
		return this
	}

	setNonce(nonce: bigint): UserOperationBuilder {
		this.userOp.nonce = nonce
		return this
	}

	setPaymaster(paymaster: string, paymasterData: string = '0x', paymasterPostOpGasLimit: number = 0): UserOperationBuilder {
		this.userOp.paymaster = paymaster
		this.userOp.paymasterData = paymasterData
		this.userOp.paymasterPostOpGasLimit = paymasterPostOpGasLimit
		return this
	}

	setCallData(callData: string): UserOperationBuilder {
		this.userOp.callData = callData
		return this
	}

	setSignature(signature: string): UserOperationBuilder {
		this.userOp.signature = signature
		return this
	}

	getUserOperation(): UserOperation {
		return { ...this.userOp }
	}

	// Asynchronous operations (separate from fluent chain)
	async setFeeDataAsync(): Promise<void> {
		const { maxFeePerGas, maxPriorityFeePerGas } = await this.client.getFeeData()
		if (!maxFeePerGas || !maxPriorityFeePerGas) {
			throw new Error('Failed to get fee data')
		}

		this.userOp.maxFeePerGas = maxFeePerGas
		this.userOp.maxPriorityFeePerGas = maxPriorityFeePerGas
	}

	async estimateGasAsync(): Promise<void> {
		try {
			const estimations = await this.bundler.estimateUserOperationGas(this.userOp, this.entryPointAddress)

			this.userOp.verificationGasLimit = estimations.verificationGasLimit
			this.userOp.preVerificationGas = estimations.preVerificationGas
			this.userOp.callGasLimit = estimations.callGasLimit
			this.userOp.paymasterVerificationGasLimit = estimations.paymasterVerificationGasLimit
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			process.exit(1)
		}
	}

	async signWithWalletAsync(privateKey: string): Promise<void> {
		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		console.log('userOpHash', hexlify(hash))

		const wallet = new Wallet(privateKey)
		const signature = await wallet.signMessage(hash)
		this.userOp.signature = signature
	}

	async executeAsync(): Promise<void> {
		try {
			await this.bundler.sendUserOperation(this.userOp, this.entryPointAddress)
			console.log('sent')
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			return
		}

		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		const receipt = await this.bundler.waitForReceipt(hexlify(hash))

		console.log('receipt', receipt)
		console.log('success', receipt.success)
	}

	// Convenience method to handle all async operations in sequence
	async prepareAndExecute(privateKey: string): Promise<void> {
		await this.setFeeDataAsync()
		await this.estimateGasAsync()
		await this.signWithWalletAsync(privateKey)
		await this.executeAsync()
	}
}

// Main execution with clear separation
async function main() {
	const { accountAddress, factory, factoryData } = await getKernelAddress(ADDRESS.ECDSAValidator, dev7702)
	const nonce = await getKernelNonce(accountAddress, ADDRESS.ECDSAValidator)

	// Phase 1: Synchronous configuration (fluent)
	const userOpBuilder = new UserOperationBuilder(bundler, client, entryPointAddress, CHAIN_ID)
		.setSender(accountAddress)
		.setFactory(factory, factoryData)
		.setNonce(nonce)
		.setPaymaster(ADDRESS.PublicPaymaster)
		.setCallData('0x')
		.setSignature(DUMMY_ECDSA_SIGNATURE)

	// Phase 2: Asynchronous operations (separate method calls)
	await userOpBuilder.setFeeDataAsync()
	await userOpBuilder.estimateGasAsync()
	await userOpBuilder.signWithWalletAsync(dev7702pk)
	await userOpBuilder.executeAsync()

	// Alternative: Use the convenience method
	// await userOpBuilder.prepareAndExecute(dev7702pk)
}

main().catch(console.error)

async function getKernelAddress(
	validatorAddress: string,
	validatorData: string,
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

	const salt = randomBytes32()

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

	const kernelFactory = new Contract(KERNEL_V3_3_FACTORY, KERNEL_V3_3_FACTORY_ABI, client)
	const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

	return { factory: KERNEL_V3_3_FACTORY, factoryData, accountAddress }
}

async function getKernelNonce(accountAddress: string, validatorAddress: string) {
	const defaultOptions = {
		mode: KernelValidationMode.DEFAULT,
		type: KernelValidationType.ROOT,
		identifier: validatorAddress,
		key: zeroBytes(2),
	}
	const { mode, type, identifier, key } = defaultOptions
	const nonceKey = BigInt(concat([mode, type, identifier, key]))

	return await entryPoint.getNonce(accountAddress, nonceKey)
}
```

## Key improvements:

1. **Clear Separation**: 
   - **Sync methods**: Use fluent interface pattern (return `this`)
   - **Async methods**: Have `Async` suffix and return `Promise<void>`

2. **Two-Phase Approach**:
   - **Phase 1**: Synchronous configuration with method chaining
   - **Phase 2**: Asynchronous operations with separate await calls

3. **Convenience Method**: `prepareAndExecute()` handles all async operations in sequence

4. **Naming Convention**: All async methods have `Async` suffix to make intent clear

5. **No Mixing**: Never mix sync fluent methods with promise-returning methods in the same chain

This approach makes it crystal clear which methods are synchronous configuration and which are asynchronous operations, eliminating the confusion from the mixed promise/fluent pattern.

```typescript
import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { KernelValidationMode, KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { randomBytes32, zeroBytes } from '@/utils'
import type { EthersError } from 'ethers'
import { concat, Contract, hexlify, Interface, isError, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { EntryPointV07__factory, ERC4337Bundler, getEmptyUserOp, getUserOpHash, UserOperation } from 'ethers-erc4337'
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

class UserOperationBuilder {
	private userOp: UserOperation
	private bundler: ERC4337Bundler
	private client: JsonRpcProvider
	private entryPointAddress: string
	private chainId: number

	constructor(bundler: ERC4337Bundler, client: JsonRpcProvider, entryPointAddress: string, chainId: number) {
		this.userOp = getEmptyUserOp()
		this.bundler = bundler
		this.client = client
		this.entryPointAddress = entryPointAddress
		this.chainId = chainId
	}

	// Synchronous configuration methods (fluent)
	setSender(sender: string): UserOperationBuilder {
		this.userOp.sender = sender
		return this
	}

	setFactory(factory: string, factoryData: string): UserOperationBuilder {
		this.userOp.factory = factory
		this.userOp.factoryData = factoryData
		return this
	}

	setNonce(nonce: bigint): UserOperationBuilder {
		this.userOp.nonce = nonce
		return this
	}

	setPaymaster(paymaster: string, paymasterData: string = '0x', paymasterPostOpGasLimit: number = 0): UserOperationBuilder {
		this.userOp.paymaster = paymaster
		this.userOp.paymasterData = paymasterData
		this.userOp.paymasterPostOpGasLimit = paymasterPostOpGasLimit
		return this
	}

	setCallData(callData: string): UserOperationBuilder {
		this.userOp.callData = callData
		return this
	}

	setSignature(signature: string): UserOperationBuilder {
		this.userOp.signature = signature
		return this
	}

	getUserOperation(): UserOperation {
		return { ...this.userOp }
	}

	// Asynchronous operations (separate from fluent chain)
	async setFeeDataAsync(): Promise<void> {
		const { maxFeePerGas, maxPriorityFeePerGas } = await this.client.getFeeData()
		if (!maxFeePerGas || !maxPriorityFeePerGas) {
			throw new Error('Failed to get fee data')
		}

		this.userOp.maxFeePerGas = maxFeePerGas
		this.userOp.maxPriorityFeePerGas = maxPriorityFeePerGas
	}

	async estimateGasAsync(): Promise<void> {
		try {
			const estimations = await this.bundler.estimateUserOperationGas(this.userOp, this.entryPointAddress)

			this.userOp.verificationGasLimit = estimations.verificationGasLimit
			this.userOp.preVerificationGas = estimations.preVerificationGas
			this.userOp.callGasLimit = estimations.callGasLimit
			this.userOp.paymasterVerificationGasLimit = estimations.paymasterVerificationGasLimit
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			process.exit(1)
		}
	}

	async signWithWalletAsync(privateKey: string): Promise<void> {
		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		console.log('userOpHash', hexlify(hash))

		const wallet = new Wallet(privateKey)
		const signature = await wallet.signMessage(hash)
		this.userOp.signature = signature
	}

	async executeAsync(): Promise<void> {
		try {
			await this.bundler.sendUserOperation(this.userOp, this.entryPointAddress)
			console.log('sent')
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			return
		}

		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		const receipt = await this.bundler.waitForReceipt(hexlify(hash))

		console.log('receipt', receipt)
		console.log('success', receipt.success)
	}

	// Convenience method to handle all async operations in sequence
	async prepareAndExecute(privateKey: string): Promise<void> {
		await this.setFeeDataAsync()
		await this.estimateGasAsync()
		await this.signWithWalletAsync(privateKey)
		await this.executeAsync()
	}
}

// Main execution with clear separation
async function main() {
	const { accountAddress, factory, factoryData } = await getKernelAddress(ADDRESS.ECDSAValidator, dev7702)
	const nonce = await getKernelNonce(accountAddress, ADDRESS.ECDSAValidator)

	// Phase 1: Synchronous configuration (fluent)
	const userOpBuilder = new UserOperationBuilder(bundler, client, entryPointAddress, CHAIN_ID)
		.setSender(accountAddress)
		.setFactory(factory, factoryData)
		.setNonce(nonce)
		.setPaymaster(ADDRESS.PublicPaymaster)
		.setCallData('0x')
		.setSignature(DUMMY_ECDSA_SIGNATURE)

	// Phase 2: Asynchronous operations (separate method calls)
	await userOpBuilder.setFeeDataAsync()
	await userOpBuilder.estimateGasAsync()
	await userOpBuilder.signWithWalletAsync(dev7702pk)
	await userOpBuilder.executeAsync()

	// Alternative: Use the convenience method
	// await userOpBuilder.prepareAndExecute(dev7702pk)
}

main().catch(console.error)

async function getKernelAddress(
	validatorAddress: string,
	validatorData: string,
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

	const salt = randomBytes32()

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

	const kernelFactory = new Contract(KERNEL_V3_3_FACTORY, KERNEL_V3_3_FACTORY_ABI, client)
	const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

	return { factory: KERNEL_V3_3_FACTORY, factoryData, accountAddress }
}

async function getKernelNonce(accountAddress: string, validatorAddress: string) {
	const defaultOptions = {
		mode: KernelValidationMode.DEFAULT,
		type: KernelValidationType.ROOT,
		identifier: validatorAddress,
		key: zeroBytes(2),
	}
	const { mode, type, identifier, key } = defaultOptions
	const nonceKey = BigInt(concat([mode, type, identifier, key]))

	return await entryPoint.getNonce(accountAddress, nonceKey)
}
```

---

**User**

Can you make the Kernel account as kind of the director in the Builder pattern, and we can abstract different account types with the director. 

---

**Cursor**

Excellent idea! Let me implement the Director pattern to abstract different account types. This will make it easy to support various smart account implementations (Kernel, Safe, Nexus, etc.) with their specific configuration logic:

```typescript:test/ethers-erc4337/deploy-kernel.ts
import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { KernelValidationMode, KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { randomBytes32, zeroBytes } from '@/utils'
import type { EthersError } from 'ethers'
import { concat, Contract, hexlify, Interface, isError, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { EntryPointV07__factory, ERC4337Bundler, getEmptyUserOp, getUserOpHash, UserOperation } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'

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

// Builder - constructs UserOperation step by step
class UserOperationBuilder {
	private userOp: UserOperation
	private bundler: ERC4337Bundler
	private client: JsonRpcProvider
	private entryPointAddress: string
	private chainId: number

	constructor(bundler: ERC4337Bundler, client: JsonRpcProvider, entryPointAddress: string, chainId: number) {
		this.userOp = getEmptyUserOp()
		this.bundler = bundler
		this.client = client
		this.entryPointAddress = entryPointAddress
		this.chainId = chainId
	}

	// Synchronous configuration methods (fluent)
	setSender(sender: string): UserOperationBuilder {
		this.userOp.sender = sender
		return this
	}

	setFactory(factory: string, factoryData: string): UserOperationBuilder {
		this.userOp.factory = factory
		this.userOp.factoryData = factoryData
		return this
	}

	setNonce(nonce: bigint): UserOperationBuilder {
		this.userOp.nonce = nonce
		return this
	}

	setPaymaster(paymaster: string, paymasterData: string = '0x', paymasterPostOpGasLimit: number = 0): UserOperationBuilder {
		this.userOp.paymaster = paymaster
		this.userOp.paymasterData = paymasterData
		this.userOp.paymasterPostOpGasLimit = paymasterPostOpGasLimit
		return this
	}

	setCallData(callData: string): UserOperationBuilder {
		this.userOp.callData = callData
		return this
	}

	setSignature(signature: string): UserOperationBuilder {
		this.userOp.signature = signature
		return this
	}

	getUserOperation(): UserOperation {
		return { ...this.userOp }
	}

	// Asynchronous operations
	async setFeeDataAsync(): Promise<void> {
		const { maxFeePerGas, maxPriorityFeePerGas } = await this.client.getFeeData()
		if (!maxFeePerGas || !maxPriorityFeePerGas) {
			throw new Error('Failed to get fee data')
		}

		this.userOp.maxFeePerGas = maxFeePerGas
		this.userOp.maxPriorityFeePerGas = maxPriorityFeePerGas
	}

	async estimateGasAsync(): Promise<void> {
		try {
			const estimations = await this.bundler.estimateUserOperationGas(this.userOp, this.entryPointAddress)

			this.userOp.verificationGasLimit = estimations.verificationGas Limit
			this.userOp.preVerificationGas = estimations.preVerificationGas
			this.userOp.callGasLimit = estimations.callGasLimit
			this.userOp.paymasterVerificationGasLimit = estimations.paymasterVerificationGasLimit
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			process.exit(1)
		}
	}

	async signWithWalletAsync(privateKey: string): Promise<void> {
		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		console.log('userOpHash', hexlify(hash))

		const wallet = new Wallet(privateKey)
		const signature = await wallet.signMessage(hash)
		this.userOp.signature = signature
	}

	async executeAsync(): Promise<void> {
		try {
			await this.bundler.sendUserOperation(this.userOp, this.entryPointAddress)
			console.log('sent')
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			return
		}

		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		const receipt = await this.bundler.waitForReceipt(hexlify(hash))

		console.log('receipt', receipt)
		console.log('success', receipt.success)
	}
}

// Director interface - defines how different account types should be constructed
interface SmartAccountDirector {
	buildAccountDeployment(builder: UserOperationBuilder, ownerData: string): Promise<UserOperationBuilder>
	buildExecuteCall(builder: UserOperationBuilder, target: string, value: bigint, data: string): Promise<UserOperationBuilder>
	buildBatchExecute(builder: UserOperationBuilder, calls: { target: string; value: bigint; data: string }[]): Promise<UserOperationBuilder>
}

// Concrete Director for Kernel V3 accounts
class KernelAccountDirector implements SmartAccountDirector {
	private static readonly KERNEL_V3_3_FACTORY = '0x2577507b78c2008Ff367261CB6285d44ba5eF2E9'
	private client: JsonRpcProvider
	private entryPoint: Contract

	constructor(client: JsonRpcProvider, entryPoint: Contract) {
		this.client = client
		this.entryPoint = entryPoint
	}

	async buildAccountDeployment(builder: UserOperationBuilder, ownerData: string): Promise<UserOperationBuilder> {
		const { accountAddress, factory, factoryData } = await this.getKernelAddress(ADDRESS.ECDSAValidator, ownerData)
		const nonce = await this.getKernelNonce(accountAddress, ADDRESS.ECDSAValidator)

		return builder
			.setSender(accountAddress)
			.setFactory(factory, factoryData)
			.setNonce(nonce)
			.setPaymaster(ADDRESS.PublicPaymaster)
			.setCallData('0x') // Empty calldata for deployment
			.setSignature(DUMMY_ECDSA_SIGNATURE)
	}

	async buildExecuteCall(builder: UserOperationBuilder, target: string, value: bigint, data: string): Promise<UserOperationBuilder> {
		// Kernel V3 execute call encoding
		const executeCallData = new Interface([
			'function execute(bytes32 mode, bytes calldata executionCalldata) external payable'
		]).encodeFunctionData('execute', [
			'0x0000000000000000000000000000000000000000000000000000000000000000', // Single execution mode
			concat([target, hexlify(value, 32), data])
		])

		return builder.setCallData(executeCallData)
	}

	async buildBatchExecute(builder: UserOperationBuilder, calls: { target: string; value: bigint; data: string }[]): Promise<UserOperationBuilder> {
		// Kernel V3 batch execution encoding
		const batchCallData = calls.map(call => 
			concat([call.target, hexlify(call.value, 32), hexlify(call.data.length / 2 - 1, 32), call.data])
		).join('')

		const executeBatchCallData = new Interface([
			'function execute(bytes32 mode, bytes calldata executionCalldata) external payable'
		]).encodeFunctionData('execute', [
			'0x0100000000000000000000000000000000000000000000000000000000000000', // Batch execution mode
			batchCallData
		])

		return builder.setCallData(executeBatchCallData)
	}

	private async getKernelAddress(
		validatorAddress: string,
		validatorData: string,
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

		const salt = randomBytes32()

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

		const kernelFactory = new Contract(KernelAccountDirector.KERNEL_V3_3_FACTORY, KERNEL_V3_3_FACTORY_ABI, this.client)
		const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

		return { factory: KernelAccountDirector.KERNEL_V3_3_FACTORY, factoryData, accountAddress }
	}

	private async getKernelNonce(accountAddress: string, validatorAddress: string) {
		const defaultOptions = {
			mode: KernelValidationMode.DEFAULT,
			type: KernelValidationType.ROOT,
			identifier: validatorAddress,
			key: zeroBytes(2),
		}
		const { mode, type, identifier, key } = defaultOptions
		const nonceKey = BigInt(concat([mode, type, identifier, key]))

		return await this.entryPoint.getNonce(accountAddress, nonceKey)
	}
}

// Example: Safe Account Director (implementation skeleton)
class SafeAccountDirector implements SmartAccountDirector {
	private client: JsonRpcProvider
	private entryPoint: Contract

	constructor(client: JsonRpcProvider, entryPoint: Contract) {
		this.client = client
		this.entryPoint = entryPoint
	}

	async buildAccountDeployment(builder: UserOperationBuilder, ownerData: string): Promise<UserOperationBuilder> {
		// Safe-specific deployment logic
		throw new Error('Safe account deployment not implemented')
	}

	async buildExecuteCall(builder: UserOperationBuilder, target: string, value: bigint, data: string): Promise<UserOperationBuilder> {
		// Safe-specific execute call logic
		throw new Error('Safe execute call not implemented')
	}

	async buildBatchExecute(builder: UserOperationBuilder, calls: { target: string; value: bigint; data: string }[]): Promise<UserOperationBuilder> {
		// Safe-specific batch execution logic
		throw new Error('Safe batch execute not implemented')
	}
}

// Usage - Clean abstraction for different account types
async function main() {
	// Create the builder
	const builder = new UserOperationBuilder(bundler, client, entryPointAddress, CHAIN_ID)
	
	// Create the director for Kernel accounts
	const kernelDirector = new KernelAccountDirector(client, entryPoint)
	
	// Phase 1: Account-specific configuration via director
	const configuredBuilder = await kernelDirector.buildAccountDeployment(builder, dev7702)
	
	// Phase 2: Generic async operations
	await configuredBuilder.setFeeDataAsync()
	await configuredBuilder.estimateGasAsync()
	await configuredBuilder.signWithWalletAsync(dev7702pk)
	await configuredBuilder.executeAsync()
}

// Alternative usage for different account types
async function deployWithDifferentAccount(accountType: 'kernel' | 'safe') {
	const builder = new UserOperationBuilder(bundler, client, entryPointAddress, CHAIN_ID)
	
	let director: SmartAccountDirector
	switch (accountType) {
		case 'kernel':
			director = new KernelAccountDirector(client, entryPoint)
			break
		case 'safe':
			director = new SafeAccountDirector(client, entryPoint)
			break
		default:
			throw new Error(`Unsupported account type: ${accountType}`)
	}
	
	const configuredBuilder = await director.buildAccountDeployment(builder, dev7702)
	
	await configuredBuilder.setFeeDataAsync()
	await configuredBuilder.estimateGasAsync()
	await configuredBuilder.signWithWalletAsync(dev7702pk)
	await configuredBuilder.executeAsync()
}

main().catch(console.error)
```

## Key Benefits of the Director Pattern:

1. **Account Abstraction**: Each account type (Kernel, Safe, Nexus) has its own director with specific implementation details
2. **Extensibility**: Easy to add new account types by implementing `SmartAccountDirector`
3. **Separation of Concerns**: 
   - `UserOperationBuilder` handles generic UserOperation construction
   - Directors handle account-specific configuration logic
4. **Polymorphism**: Can switch between different account types at runtime
5. **Reusability**: Same builder can be used with different directors

## Architecture:

- **Builder** (`UserOperationBuilder`): Generic UserOperation construction
- **Director Interface** (`SmartAccountDirector`): Contract for account-specific logic  
- **Concrete Directors** (`KernelAccountDirector`, `SafeAccountDirector`): Account-specific implementations
- **Product** (`UserOperation`): The final constructed object

This pattern makes it trivial to support multiple smart account implementations while keeping the core UserOperation building logic clean and reusable.

```typescript
import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { KernelValidationMode, KernelValidationType } from '@/smart-accounts/kernel-v3/types'
import { randomBytes32, zeroBytes } from '@/utils'
import type { EthersError } from 'ethers'
import { concat, Contract, hexlify, Interface, isError, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers'
import { EntryPointV07__factory, ERC4337Bundler, getEmptyUserOp, getUserOpHash, UserOperation } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'

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

// Builder - constructs UserOperation step by step
class UserOperationBuilder {
	private userOp: UserOperation
	private bundler: ERC4337Bundler
	private client: JsonRpcProvider
	private entryPointAddress: string
	private chainId: number

	constructor(bundler: ERC4337Bundler, client: JsonRpcProvider, entryPointAddress: string, chainId: number) {
		this.userOp = getEmptyUserOp()
		this.bundler = bundler
		this.client = client
		this.entryPointAddress = entryPointAddress
		this.chainId = chainId
	}

	// Synchronous configuration methods (fluent)
	setSender(sender: string): UserOperationBuilder {
		this.userOp.sender = sender
		return this
	}

	setFactory(factory: string, factoryData: string): UserOperationBuilder {
		this.userOp.factory = factory
		this.userOp.factoryData = factoryData
		return this
	}

	setNonce(nonce: bigint): UserOperationBuilder {
		this.userOp.nonce = nonce
		return this
	}

	setPaymaster(paymaster: string, paymasterData: string = '0x', paymasterPostOpGasLimit: number = 0): UserOperationBuilder {
		this.userOp.paymaster = paymaster
		this.userOp.paymasterData = paymasterData
		this.userOp.paymasterPostOpGasLimit = paymasterPostOpGasLimit
		return this
	}

	setCallData(callData: string): UserOperationBuilder {
		this.userOp.callData = callData
		return this
	}

	setSignature(signature: string): UserOperationBuilder {
		this.userOp.signature = signature
		return this
	}

	getUserOperation(): UserOperation {
		return { ...this.userOp }
	}

	// Asynchronous operations
	async setFeeDataAsync(): Promise<void> {
		const { maxFeePerGas, maxPriorityFeePerGas } = await this.client.getFeeData()
		if (!maxFeePerGas || !maxPriorityFeePerGas) {
			throw new Error('Failed to get fee data')
		}

		this.userOp.maxFeePerGas = maxFeePerGas
		this.userOp.maxPriorityFeePerGas = maxPriorityFeePerGas
	}

	async estimateGasAsync(): Promise<void> {
		try {
			const estimations = await this.bundler.estimateUserOperationGas(this.userOp, this.entryPointAddress)

			this.userOp.verificationGasLimit = estimations.verificationGas Limit
			this.userOp.preVerificationGas = estimations.preVerificationGas
			this.userOp.callGasLimit = estimations.callGasLimit
			this.userOp.paymasterVerificationGasLimit = estimations.paymasterVerificationGasLimit
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			process.exit(1)
		}
	}

	async signWithWalletAsync(privateKey: string): Promise<void> {
		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		console.log('userOpHash', hexlify(hash))

		const wallet = new Wallet(privateKey)
		const signature = await wallet.signMessage(hash)
		this.userOp.signature = signature
	}

	async executeAsync(): Promise<void> {
		try {
			await this.bundler.sendUserOperation(this.userOp, this.entryPointAddress)
			console.log('sent')
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				console.error(e.error?.message)
			} else {
				console.error(e)
			}
			return
		}

		const hash = getUserOpHash(this.userOp, this.entryPointAddress, this.chainId)
		const receipt = await this.bundler.waitForReceipt(hexlify(hash))

		console.log('receipt', receipt)
		console.log('success', receipt.success)
	}
}

// Director interface - defines how different account types should be constructed
interface SmartAccountDirector {
	buildAccountDeployment(builder: UserOperationBuilder, ownerData: string): Promise<UserOperationBuilder>
	buildExecuteCall(builder: UserOperationBuilder, target: string, value: bigint, data: string): Promise<UserOperationBuilder>
	buildBatchExecute(builder: UserOperationBuilder, calls: { target: string; value: bigint; data: string }[]): Promise<UserOperationBuilder>
}

// Concrete Director for Kernel V3 accounts
class KernelAccountDirector implements SmartAccountDirector {
	private static readonly KERNEL_V3_3_FACTORY = '0x2577507b78c2008Ff367261CB6285d44ba5eF2E9'
	private client: JsonRpcProvider
	private entryPoint: Contract

	constructor(client: JsonRpcProvider, entryPoint: Contract) {
		this.client = client
		this.entryPoint = entryPoint
	}

	async buildAccountDeployment(builder: UserOperationBuilder, ownerData: string): Promise<UserOperationBuilder> {
		const { accountAddress, factory, factoryData } = await this.getKernelAddress(ADDRESS.ECDSAValidator, ownerData)
		const nonce = await this.getKernelNonce(accountAddress, ADDRESS.ECDSAValidator)

		return builder
			.setSender(accountAddress)
			.setFactory(factory, factoryData)
			.setNonce(nonce)
			.setPaymaster(ADDRESS.PublicPaymaster)
			.setCallData('0x') // Empty calldata for deployment
			.setSignature(DUMMY_ECDSA_SIGNATURE)
	}

	async buildExecuteCall(builder: UserOperationBuilder, target: string, value: bigint, data: string): Promise<UserOperationBuilder> {
		// Kernel V3 execute call encoding
		const executeCallData = new Interface([
			'function execute(bytes32 mode, bytes calldata executionCalldata) external payable'
		]).encodeFunctionData('execute', [
			'0x0000000000000000000000000000000000000000000000000000000000000000', // Single execution mode
			concat([target, hexlify(value, 32), data])
		])

		return builder.setCallData(executeCallData)
	}

	async buildBatchExecute(builder: UserOperationBuilder, calls: { target: string; value: bigint; data: string }[]): Promise<UserOperationBuilder> {
		// Kernel V3 batch execution encoding
		const batchCallData = calls.map(call => 
			concat([call.target, hexlify(call.value, 32), hexlify(call.data.length / 2 - 1, 32), call.data])
		).join('')

		const executeBatchCallData = new Interface([
			'function execute(bytes32 mode, bytes calldata executionCalldata) external payable'
		]).encodeFunctionData('execute', [
			'0x0100000000000000000000000000000000000000000000000000000000000000', // Batch execution mode
			batchCallData
		])

		return builder.setCallData(executeBatchCallData)
	}

	private async getKernelAddress(
		validatorAddress: string,
		validatorData: string,
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

		const salt = randomBytes32()

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

		const kernelFactory = new Contract(KernelAccountDirector.KERNEL_V3_3_FACTORY, KERNEL_V3_3_FACTORY_ABI, this.client)
		const accountAddress = (await kernelFactory['getAddress(bytes,bytes32)'](initializeData, salt)) as string

		return { factory: KernelAccountDirector.KERNEL_V3_3_FACTORY, factoryData, accountAddress }
	}

	private async getKernelNonce(accountAddress: string, validatorAddress: string) {
		const defaultOptions = {
			mode: KernelValidationMode.DEFAULT,
			type: KernelValidationType.ROOT,
			identifier: validatorAddress,
			key: zeroBytes(2),
		}
		const { mode, type, identifier, key } = defaultOptions
		const nonceKey = BigInt(concat([mode, type, identifier, key]))

		return await this.entryPoint.getNonce(accountAddress, nonceKey)
	}
}

// Example: Safe Account Director (implementation skeleton)
class SafeAccountDirector implements SmartAccountDirector {
	private client: JsonRpcProvider
	private entryPoint: Contract

	constructor(client: JsonRpcProvider, entryPoint: Contract) {
		this.client = client
		this.entryPoint = entryPoint
	}

	async buildAccountDeployment(builder: UserOperationBuilder, ownerData: string): Promise<UserOperationBuilder> {
		// Safe-specific deployment logic
		throw new Error('Safe account deployment not implemented')
	}

	async buildExecuteCall(builder: UserOperationBuilder, target: string, value: bigint, data: string): Promise<UserOperationBuilder> {
		// Safe-specific execute call logic
		throw new Error('Safe execute call not implemented')
	}

	async buildBatchExecute(builder: UserOperationBuilder, calls: { target: string; value: bigint; data: string }[]): Promise<UserOperationBuilder> {
		// Safe-specific batch execution logic
		throw new Error('Safe batch execute not implemented')
	}
}

// Usage - Clean abstraction for different account types
async function main() {
	// Create the builder
	const builder = new UserOperationBuilder(bundler, client, entryPointAddress, CHAIN_ID)
	
	// Create the director for Kernel accounts
	const kernelDirector = new KernelAccountDirector(client, entryPoint)
	
	// Phase 1: Account-specific configuration via director
	const configuredBuilder = await kernelDirector.buildAccountDeployment(builder, dev7702)
	
	// Phase 2: Generic async operations
	await configuredBuilder.setFeeDataAsync()
	await configuredBuilder.estimateGasAsync()
	await configuredBuilder.signWithWalletAsync(dev7702pk)
	await configuredBuilder.executeAsync()
}

// Alternative usage for different account types
async function deployWithDifferentAccount(accountType: 'kernel' | 'safe') {
	const builder = new UserOperationBuilder(bundler, client, entryPointAddress, CHAIN_ID)
	
	let director: SmartAccountDirector
	switch (accountType) {
		case 'kernel':
			director = new KernelAccountDirector(client, entryPoint)
			break
		case 'safe':
			director = new SafeAccountDirector(client, entryPoint)
			break
		default:
			throw new Error(`Unsupported account type: ${accountType}`)
	}
	
	const configuredBuilder = await director.buildAccountDeployment(builder, dev7702)
	
	await configuredBuilder.setFeeDataAsync()
	await configuredBuilder.estimateGasAsync()
	await configuredBuilder.signWithWalletAsync(dev7702pk)
	await configuredBuilder.executeAsync()
}

main().catch(console.error)
```

```typescript
this.userOp.verificationGasLimit = estimations.verificationGas Limit
```

```typescript
this.userOp.verificationGasLimit = estimations.verificationGasLimit
```

---

**User**

So if the director has to add a method for installing and uninstalling modules, it depends on the different account types. We can add the install module and uninstall module to the director interface, right? Don't give me any code, just explain it and give me some advice. 

---

**Cursor**

Absolutely! Adding `installModule` and `uninstallModule` methods to the `SmartAccountDirector` interface is a perfect fit for this pattern. Here's why this makes sense and some design considerations:

## Why This Fits the Director Pattern Perfectly:

**Account-Specific Module Systems**: Each smart account implementation has its own module architecture:
- **Kernel V3**: Distinguishes between validators, executors, hooks, and policies with different installation procedures
- **Safe**: Uses modules and guards with specific interfaces and installation flows  
- **Nexus**: Has its own module registry and installation system
- **Future accounts**: Will likely have their own unique approaches

## Design Advice:

### 1. **Interface Design Options**
You have a few approaches for the interface methods:

**Generic Approach**:
```
installModule(builder, moduleAddress, moduleType, initData)
uninstallModule(builder, moduleAddress, moduleType)
```

**Specific Approach**:
```
installValidator(builder, validatorAddress, initData)
installExecutor(builder, executorAddress, initData)  
installHook(builder, hookAddress, initData)
```

**Hybrid Approach**: Generic methods that take module type enums, allowing each director to handle their specific types.

### 2. **Key Considerations**

**Module Type Abstraction**: Different accounts categorize modules differently. You might need an abstraction layer or let each director define their own module types.

**Initialization Data**: Module installation often requires specific initialization parameters that vary by account type and module type.

**Batch Operations**: Consider supporting batch install/uninstall since users often want to configure multiple modules at once.

**Validation**: Some accounts have prerequisites (e.g., must have at least one validator) that the director should enforce.

**State Management**: Directors might need to track installed modules to prevent conflicts or ensure proper sequencing.

### 3. **Benefits of This Approach**

**Encapsulation**: All account-specific module logic stays within the director, keeping the builder generic.

**Extensibility**: New account types can implement their own module systems without affecting existing code.

**User Experience**: Developers can manage modules without learning each account's specific interfaces.

**Testing**: Each director can be tested independently with its specific module management logic.

### 4. **Implementation Strategy**

**Start Simple**: Begin with basic install/uninstall for the most common module types.

**Iterate**: Add more sophisticated features (batch operations, validation, state tracking) as needed.

**Documentation**: Since module systems vary significantly, good documentation of what each director supports is crucial.

**Error Handling**: Each account type will have different failure modes for module operations.

This extension would make your Director pattern even more powerful, providing a clean abstraction over the complex and varied world of smart account module management!

```plaintext
installModule(builder, moduleAddress, moduleType, initData)
uninstallModule(builder, moduleAddress, moduleType)
```

```plaintext
installValidator(builder, validatorAddress, initData)
installExecutor(builder, executorAddress, initData)  
installHook(builder, hookAddress, initData)
```

