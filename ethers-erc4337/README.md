# ethers-erc4337

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
