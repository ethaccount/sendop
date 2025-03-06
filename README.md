# sendop.js

A TypeScript library for sending user operations for ERC-4337 contracts.

```
npm install ethers sendop
```

- only support ethers v6

### Dev Commands

```sh
bun install
docker compose up -d

bun run test
bun test

bun run build
```

### Usage

Send a user operation using Kernel Smart Account

```ts
const op = await kernel.send([
    {
        to: COUNTER_ADDRESS,
        data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
        value: '0x0',
    },
])
const receipt = await op.wait()
```

Send a user operation to deploy Kernel and make a transaction

```ts
const op = await sendop({
    bundler: new PimlicoBundler(chainId, BUNDLER_URL),
    executions: [
        {
            to: COUNTER_ADDRESS,
            data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
            value: '0x0',
        },
    ],
    opGetter: kernel,
    pmGetter: new MyPaymaster({
        client,
        paymasterAddress: CHARITY_PAYMASTER_ADDRESS,
    }),
    initCode: kernel.getInitCode(creationOptions),
})
const receipt = await op.wait()
```


Send a user operation for your ERC-4337 contract
```ts
const op = await sendop({
    bundler: new PimlicoBundler(CHAIN_ID, BUNDLER_URL),
    executions: [
        {
            to: COUNTER_ADDRESS,
            data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
            value: '0x0',
        },
    ],
    opGetter: {
        getSender() {
            return ERC4337_CONTRACT_ADDRESS
        },
        async getNonce() {
            const nonce: bigint = await getEntryPointContract(client).getNonce(ERC4337_CONTRACT_ADDRESS, 0)
            return toBeHex(nonce)
        },
        getCallData(executions: Execution[]) {
            return executions[0].data
        },
        async getDummySignature() {
            return '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'
        },
        async getSignature(userOpHash: Uint8Array) {
            return await wallet.signMessage(userOpHash)
        },
    },
})
const receipt = await op.wait()
```

- For complete examples, please refer to *.test.ts

## Contracts

| name                      | networks      | address                                    |
| ------------------------- | ------------- | ------------------------------------------ |
| ECDSA_VALIDATOR           | local,sepolia | 0x971208C0409CFB2fD44C64E6158cf3335abb4476 |
| WEB_AUTHN_VALIDATOR       | local,sepolia | 0xdeAFE53E9117379a72c242E35db94De14570f970 |
| COUNTER                   | local,sepolia | 0x28Df249aF7555EB3D252Ebd6BFDb830f1dD4B790 |
| CHARITY_PAYMASTER_ADDRESS | local,sepolia | 0x35124236d1a7210B43Cb46897Bc957dEFb42c777 |
| KERNEL_FACTORY            | local,sepolia | 0xaac5D4240AF87249B3f71BC8E4A2cae074A3E419 |
