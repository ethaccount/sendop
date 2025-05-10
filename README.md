# sendop.js

> ⚠️ **WARNING**: This project is under active development. Use at your own risk.

```sh
npm install ethers sendop
```

### Usage (v0.4.2)

For more details, please refer to the *.test.ts files or the test folder.

```ts
import { Interface, JsonRpcProvider, Wallet } from 'ethers'
import {
	ADDRESS,
	PimlicoBundler,
	PublicPaymaster,
	randomBytes32,
	sendop,
	SimpleAccount,
	SimpleAccountCreationOptions,
} from 'sendop'

const PRIVATE_KEY = process.env.acc0pk as string
const CLIENT_URL = process.env.sepolia as string
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY as string

const chainId = 11155111n

const client = new JsonRpcProvider(CLIENT_URL)
const signer = new Wallet(PRIVATE_KEY, client)
const bundler = new PimlicoBundler(chainId, `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`, {
	entryPointVersion: 'v0.8',
	parseError: true,
})

console.log('signer.address:', signer.address)

const creationOptions: SimpleAccountCreationOptions = {
	owner: signer.address,
	salt: randomBytes32(),
}

const accountAddress = await SimpleAccount.computeAccountAddress(client, creationOptions)
console.log('accountAddress:', accountAddress)

console.log('sending user operation...')

const op = await sendop({
	bundler,
	initCode: SimpleAccount.getInitCode(creationOptions),
	executions: [
		{
			to: ADDRESS.Counter,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
				Math.floor(Math.random() * 1000),
			]),
			value: 0n,
		},
	],
	opGetter: new SimpleAccount({
		address: accountAddress,
		client,
		bundler,
		signer,
	}),
	pmGetter: new PublicPaymaster(ADDRESS.PublicPaymaster),
})

console.log('waiting for user operation...')
console.log('opHash:', op.hash)

const receipt = await op.wait()
console.log('receipt.success', receipt.success)
```

Output

```
signer.address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
accountAddress: 0x88E4c727400acDc9848562a7467b6621A6669Be7
sending user operation...
waiting for user operation...
opHash: 0xc78aeac067179f710a5e7c0cf9cfe778d397ab1bf9d6c4d8986429995eea2420
receipt.success true
```

### Dev Commands

```sh
bun install
docker compose up -d

bun test # bun built-in test
bun run test # vitest (isolate)
bun test -t 'test case' # test specific test case

bun run build

bun run build:contract-types
```

### Dev Notes

- Use SendopError to handle all errors thrown by this library

## License

Copyright (C) 2024-2025 Johnson Chen

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License version 3
as published by the Free Software Foundation.