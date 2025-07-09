# ethers-erc4337

> **⚠️ DEPRECATION WARNING**
> 
> This is the last version of `ethers-erc4337`.
> 
> For continued support and new features, please migrate to **[sendop](https://github.com/ethaccount/sendop)** - the actively maintained successor library that includes all functions from `ethers-erc4337`.

ERC-4337 utilities for ethers.js - A lightweight library for interacting with ERC-4337 Account Abstraction infrastructure.

## Features

- 🔐 **EntryPoint Support**: Full compatibility with EntryPoint v0.7 and v0.8, including TypeScript contract types generated via typechain for seamless development
- 🔗 **Bundler Integration**: Extends ethers JsonRpcProvider to seamlessly integrate bundler RPC calls with the ethers ecosystem
- 📦 **UserOperation Utils**: Complete utilities to pack, unpack, and hash UserOperations

## Installation

```bash
npm install ethers ethers-erc4337
```

## Quick Start

### Using UserOpBuilder (Recommended)

```typescript
import { ERC4337Bundler, UserOpBuilder } from 'ethers-erc4337'
import { getBytes, JsonRpcProvider, Wallet } from 'ethers'

// Initialize bundler and provider
const bundler = new ERC4337Bundler('https://your-bundler-url')
const provider = new JsonRpcProvider('https://your-rpc-url')
const wallet = new Wallet('your-private-key')

// Create UserOpBuilder
const userOpBuilder = new UserOpBuilder({
  chainId: 1, // Your chain ID
  bundler,
  entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
})

// Build UserOperation with fluent API
userOpBuilder
  .setSender('0x...') // Your smart account address
  .setCallData('0x...') // Encoded function call
  .setNonce(0n)
  .setGasPrice({
    maxFeePerGas: 1000000000n,
    maxPriorityFeePerGas: 1000000000n
  })

// For account deployment, add factory
userOpBuilder.setFactory({
  factory: '0x...',
  factoryData: '0x...'
})

// For paymaster usage
userOpBuilder.setPaymaster({
  paymaster: '0x...',
  paymasterData: '0x...',
  paymasterPostOpGasLimit: 50000n
})

// Estimate gas
await userOpBuilder.estimateGas()

// Sign the UserOperation
await userOpBuilder.signUserOpHash(async (userOpHash) => {
  return await wallet.signMessage(getBytes(userOpHash))
})

// Send and wait for receipt
const { hash, receipt } = await userOpBuilder.execute()
console.log('UserOperation executed:', receipt.success)
console.log('Hash:', hash)
```

### Manual Approach

```typescript
import { ERC4337Bundler, getEmptyUserOp, getUserOpHash } from 'ethers-erc4337'
import { JsonRpcProvider, Wallet } from 'ethers'

// Initialize bundler and provider
const bundler = new ERC4337Bundler('https://your-bundler-url')
const provider = new JsonRpcProvider('https://your-rpc-url')

// Create a UserOperation
const userOp = getEmptyUserOp()
userOp.sender = '0x...' // Your smart account address
userOp.callData = '0x...' // Encoded function call
userOp.nonce = 0n

// Estimate gas
const gasEstimate = await bundler.estimateUserOperationGas(userOp, entryPointAddress)
userOp.callGasLimit = gasEstimate.callGasLimit
userOp.verificationGasLimit = gasEstimate.verificationGasLimit
userOp.preVerificationGas = gasEstimate.preVerificationGas

// Sign the UserOperation
const userOpHash = getUserOpHash(userOp, entryPointAddress, chainId)
const signature = await wallet.signMessage(userOpHash)
userOp.signature = signature

// Send UserOperation
const userOpHash = await bundler.sendUserOperation(userOp, entryPointAddress)

// Wait for receipt
const receipt = await bundler.waitForReceipt(userOpHash)
console.log('UserOperation executed:', receipt.success)
```

## API Reference

### ERC4337Bundler

The main class for interacting with ERC-4337 bundlers.

```typescript
const bundler = new ERC4337Bundler(bundlerUrl, network, options)
```

#### Methods

- `sendUserOperation(userOp, entryPointAddress)` - Send a UserOperation to the bundler
- `estimateUserOperationGas(userOp, entryPointAddress)` - Estimate gas costs
- `getUserOperationByHash(hash)` - Get UserOperation by hash
- `getUserOperationReceipt(hash)` - Get UserOperation receipt
- `waitForReceipt(hash, timeout?, interval?)` - Wait for UserOperation to be mined
- `supportedEntryPoints()` - Get supported EntryPoint addresses
- `chainId()` - Get chain ID

#### Options

```typescript
interface ERC4337BundlerOptions {
  // Enable standard eth_ methods on the bundler endpoint
  supportsEthMethods?: boolean
  
  // Separate provider URL for standard eth_ methods
  ethProviderUrl?: string | FetchRequest
}
```

### UserOpBuilder

A fluent API for building and executing UserOperations.

```typescript
import { UserOpBuilder } from 'ethers-erc4337'

const userOpBuilder = new UserOpBuilder({
  chainId: 1,
  bundler: bundlerInstance,
  entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
})
```

#### Configuration Methods

- `setSender(address)` - Set the smart account address
- `setCallData(callData)` - Set the encoded function call data
- `setNonce(nonce)` - Set the nonce for the UserOperation
- `setFactory({ factory, factoryData })` - Set factory for account deployment
- `setEIP7702Auth(auth)` - Set EIP-7702 authorization for delegated accounts
- `setPaymaster({ paymaster, paymasterData, paymasterPostOpGasLimit })` - Set paymaster configuration
- `setGasPrice({ maxFeePerGas, maxPriorityFeePerGas })` - Set gas price configuration
- `setGasValue(gasValues)` - Set gas limit values
- `setSignature(signature)` - Set the signature

#### Utility Methods

- `preview()` - Preview the UserOperation without modifying the builder
- `pack()` - Get the packed UserOperation (EntryPoint v0.8 format)
- `hex()` - Get the UserOperation with hex-encoded fields
- `hash()` - Get the UserOperation hash for signing
- `typedData()` - Get the EIP-712 typed data for signing

#### Execution Methods

- `estimateGas()` - Estimate gas costs and update the UserOperation
- `signUserOpHash(signFn)` - Sign the UserOperation hash
- `signUserOpTypedData(signFn)` - Sign using EIP-712 typed data
- `send()` - Send the UserOperation to the bundler
- `wait()` - Wait for the UserOperation receipt
- `execute()` - Send and wait for receipt in one call

#### Advanced Methods

- `encodeHandleOpsData(options)` - Encode data for direct EntryPoint interaction
- `encodeHandleOpsDataWithDefaultGas(options)` - Encode with default gas values

#### Example: Complete Flow

```typescript
const userOpBuilder = new UserOpBuilder({ chainId, bundler, entryPointAddress })

// Build the operation
const receipt = await userOpBuilder
  .setSender(accountAddress)
  .setCallData(callData)
  .setNonce(nonce)
  .setFactory({ factory, factoryData }) // For deployment
  .setPaymaster({ paymaster, paymasterData, paymasterPostOpGasLimit })
  .setGasPrice({ maxFeePerGas, maxPriorityFeePerGas })
  .estimateGas()
  .then(async (builder) => {
    // Sign the operation
    await builder.signUserOpHash(async (hash) => {
      return await wallet.signMessage(getBytes(hash))
    })
    
    // Execute and return receipt
    return await builder.execute()
  })

console.log('Operation executed:', receipt.success)
```

### Utility Functions

#### UserOperation Helpers

```typescript
import { getEmptyUserOp, packUserOp, unpackUserOp } from 'ethers-erc4337'

// Create empty UserOperation
const userOp = getEmptyUserOp()

// Pack UserOperation (for EntryPoint v0.8)
const packedUserOp = packUserOp(userOp)

// Unpack UserOperation
const userOp = unpackUserOp(packedUserOp)
```

#### Hashing

```typescript
import { getUserOpHash } from 'ethers-erc4337'

// Get UserOperation hash (supports both v0.7 and v0.8)
const hash = getUserOpHash(userOp, entryPointAddress, chainId)

// For EIP-7702 accounts
const hash = getUserOpHashWithEip7702(userOp, chainId, delegateAddress)
```

### EntryPoint Contracts

Pre-generated TypeScript contracts for EntryPoint interactions:

```typescript
import { EntryPointV07__factory, EntryPointV08__factory } from 'ethers-erc4337'

const entryPointV07 = EntryPointV07__factory.connect(address, provider)
const entryPointV08 = EntryPointV08__factory.connect(address, provider)
```

## Constants

The library provides commonly used addresses:

```typescript
import { ENTRY_POINT_V07_ADDRESS, ENTRY_POINT_V08_ADDRESS } from 'ethers-erc4337'
```

## Requirements

- Node.js 18+
- ethers.js v6.14.4+

## License

AGPL-3.0-only
