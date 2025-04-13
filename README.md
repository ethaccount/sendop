# sendop.js

> ⚠️ **WARNING**: This project is under active development. Use at your own risk. The code has not been audited and may contain security vulnerabilities. Users are responsible for their own security when using this software.

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
```

#### Flow to update addresses.json

```

```

### Usage (v0.3.0)

For more details, please refer to the *.test.ts files or the test folder.

```ts
import { Interface, JsonRpcProvider, toBeHex, Wallet } from 'ethers'
import { ADDRESS, AlchemyBundler, EOAValidatorModule, KernelV3Account, randomBytes32, sendop } from 'sendop'

const PRIVATE_KEY = process.env.PRIVATE_KEY as string
const CLIENT_URL = process.env.sepolia as string
const BUNDLER_URL = process.env.sepolia as string

const chainId = 11155111n

const client = new JsonRpcProvider(CLIENT_URL)
const signer = new Wallet(PRIVATE_KEY, client)
const bundler = new AlchemyBundler(chainId, BUNDLER_URL, {
	parseError: true,
})
const validator = new EOAValidatorModule({
	address: ADDRESS.K1Validator,
	signer: new Wallet(PRIVATE_KEY),
})
const pmGetter = {
	getPaymasterStubData() {
		return {
			paymaster: ADDRESS.CharityPaymaster,
			paymasterData: '0x',
			paymasterVerificationGasLimit: toBeHex(999_999n),
			paymasterPostOpGasLimit: toBeHex(999_999n),
			isFinal: true,
		}
	},
}

const creationOptions = {
	salt: randomBytes32(),
	validatorAddress: ADDRESS.K1Validator,
	validatorInitData: signer.address,
}
const computedAddress = await KernelV3Account.getNewAddress(client, creationOptions)

console.log('computedAddress', computedAddress)
console.log('Sending userOp...')

const op = await sendop({
	bundler,
	opGetter: new KernelV3Account({
		address: computedAddress,
		client,
		bundler,
		validator,
	}),
	pmGetter,
	initCode: KernelV3Account.getInitCode(creationOptions),
	executions: [
		{
			to: ADDRESS.Counter,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
				Math.floor(Math.random() * 100),
			]),
			value: 0n,
		},
	],
})
console.log('Waiting for userOp, hash:', op.hash)
const receipt = await op.wait()

console.log('Done:', receipt.success)
```

Output

```
computedAddress 0xF2AcD7568730cA03a88FB8240501f0aD5bfAEe65
Sending userOp...
Waiting for userOp, hash: 0x2e1682447cd0e76fb7b17afd5e56d9444efa496d2b338add1e0085906c258ff3
Done: true
```