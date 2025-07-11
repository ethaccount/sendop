import { ADDRESS } from '@/addresses'
import { ERC4337Bundler, UserOpBuilder } from '@/core'
import { alchemy, pimlico } from 'evm-providers'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}

const CHAIN_ID = 84532

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
console.log(rpcUrl)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const op = UserOpBuilder.from(
	{
		sender: '0x5260CC89F8Ab5745b391c1bafcf914A13A0370e2',
		nonce: '0x8104e3ad430ea6d354d013a6789fdfc71e671c4300000000000000000015',
		callGasLimit: '0x4623',
		verificationGasLimit: '0x1573d',
		preVerificationGas: '0xc0ee',
		maxFeePerGas: '0x1005e2',
		maxPriorityFeePerGas: '0x100590',
		paymaster: '0xcD1c62f36A99f306948dB76c35Bbc1A639f92ce8',
		paymasterData: '0x',
		paymasterVerificationGasLimit: '0x4c83',
		paymasterPostOpGasLimit: '0x0',
		callData:
			'0xe9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003896e44d241d3a6b069c3df4e69de28ea098805b180000000000000000000000000000000000000000000000000000000000000000d09de08a0000000000000000',
		signature:
			'0x99119a9dc42a9db47136a4ecec94b44e5e839eb3fda87e75bbee9f599da1cd0770977c52ab366aedd6e5748c746368fa3ac9e24744c7dbe69a735fade732b7811b',
	},
	{
		chainId: 84532,
		bundler: new ERC4337Bundler(bundlerUrl),
		entryPointAddress: ADDRESS.EntryPointV07,
	},
)

const hash = await op.send()

const receipt = await op.wait()
console.log(receipt.success)
