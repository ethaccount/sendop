# sendop.js

> ⚠️ **WARNING**: This project is under active development. Use at your own risk.

```sh
npm install ethers sendop
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

### Usage (v0.4.0-beta.8)

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

const PRIVATE_KEY = process.env.PRIVATE_KEY as string
const CLIENT_URL = process.env.sepolia as string
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY as string

const chainId = 11155111n

const client = new JsonRpcProvider(CLIENT_URL)
const signer = new Wallet(PRIVATE_KEY, client)
const bundler = new PimlicoBundler(chainId, `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`, {
	entryPointVersion: 'v0.8',
	parseError: true,
})

const creationOptions: SimpleAccountCreationOptions = {
	owner: signer.address,
	salt: randomBytes32(),
}

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
		address: await SimpleAccount.computeAccountAddress(client, creationOptions),
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
sending user operation...
waiting for user operation...
opHash: 0xe17b7a3fd30c89dbbf55bba82122f7e44b2ef832248a584a795c4247a3bf3573
receipt.success true
```