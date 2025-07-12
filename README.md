# sendop

A TypeScript library for ERC-4337 account abstraction, making smart contract wallets simple and accessible.

For usage examples of this library, see [Smart Account Manager](https://github.com/ethaccount/SAManager), an open web wallet built on ERC-4337.

## Features

- **Multiple Account Types**: Support for Kernel, Nexus, Safe7579, and Simple7702 accounts
- **Modular Accounts**: Full support for ERC-7579 modular account standard
- **EIP-7702 Support**: Utilities for EIP-7702 and ERC-4337 integration
- **Flexible Validation**: ECDSA, WebAuthn, and custom validator support
- **Paymaster Integration**: Public Paymaster and USDC Paymaster support
- **Multi-Bundler Support**: Works with Alchemy, Pimlico, and other ERC-4337 bundlers
- **UserOpBuilder**: Intuitive chainable API for constructing user operations

## Installation

```sh
npm install ethers sendop
```

## Quick Start (v0.5.0)

### Deploy a Kernel account and increment the counter

```ts
import { getBytes, hexlify, JsonRpcProvider, randomBytes, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import {
	ADDRESS,
	ERC4337Bundler,
	fetchGasPricePimlico,
	getECDSAValidator,
	getPublicPaymaster,
	INTERFACES,
	KernelAccountAPI,
	KernelAPI,
	SingleEOAValidation,
	UserOpBuilder,
} from 'sendop'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', PRIVATE_KEY = '' } = process.env

// Setup providers
const CHAIN_ID = 84532 // Base Sepolia
const client = new JsonRpcProvider(alchemy(CHAIN_ID, ALCHEMY_API_KEY))
const bundler = new ERC4337Bundler(pimlico(CHAIN_ID, PIMLICO_API_KEY))

// Setup signer and validator
const signer = new Wallet(PRIVATE_KEY)
const ecdsaValidator = getECDSAValidator({ ownerAddress: signer.address })

const { accountAddress, factory, factoryData } = await KernelAPI.getDeployment({
	client,
	validatorAddress: ecdsaValidator.address,
	validatorData: ecdsaValidator.initData,
	salt: hexlify(randomBytes(32)),
})

// Create account API
const kernelAPI = new KernelAccountAPI({
	validation: new SingleEOAValidation(),
	validatorAddress: ecdsaValidator.address,
})

// Define operations to execute
const executions = [
	{
		to: ADDRESS.Counter,
		value: 0n,
		data: INTERFACES.Counter.encodeFunctionData('increment'),
	},
]

// Build operation
const op = new UserOpBuilder({
	chainId: CHAIN_ID,
	bundler,
	entryPointAddress: kernelAPI.entryPointAddress,
})
	.setSender(accountAddress)
	.setFactory({
		factory,
		factoryData,
	})
	.setCallData(await kernelAPI.getCallData(executions))
	.setNonce(await kernelAPI.getNonce(client, accountAddress))
	.setSignature(await kernelAPI.getDummySignature())

// Set paymaster and gas price
op.setPaymaster(getPublicPaymaster())
op.setGasPrice(await fetchGasPricePimlico(pimlico(CHAIN_ID, PIMLICO_API_KEY)))

// Estimate gas
await op.estimateGas()

// Inspect userop
console.log(op.preview())
console.log(op.toRequestParams())
console.log(op.toSendRequest())

// Sign and send
const sig = await signer.signMessage(getBytes(op.hash()))
op.setSignature(await kernelAPI.formatSignature(sig))

await op.send()
const receipt = await op.wait()

console.log('Operation success:', receipt.success)
```



### Run Tests

```sh
bun run test # vitest (recommended)
bun run test test/deployment.test.ts

bun test # bun built-in test; some tests may fail
bun test -t 'test case'
```

### Dev Commands

```sh
bun install
bun typecheck
bun run build
bun run build:contract-types
```

## License

Copyright (C) 2024-2025 Johnson Chen

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License version 3
as published by the Free Software Foundation.