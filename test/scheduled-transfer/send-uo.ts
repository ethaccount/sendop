import { ADDRESS } from '@/addresses'
import { fromUserOpHex, getUserOpHashV07, packUserOp, type UserOperationHex } from '@/ethers-erc4337'
import { RpcProvider } from '@/RpcProvider'
import { getBundlerUrl } from '../../test/utils'

const bundlerUrl = getBundlerUrl(11155111n, { type: 'pimlico' })

const formattedUserOp: UserOperationHex = {
	sender: '0x47d6a8a65cba9b61b194dac740aa192a7a1e91e1',
	nonce: '0x100000000002b0ecfbd0496ee71e01257da0e37de00000000000000000002',
	callData:
		'0xe9ae5c53000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000058a8e374779aee60413c974b484d6509c7e4ddb6ba000000000000000000000000000000000000000000000000000000000000000094f6113400000000000000000000000000000000000000000000000000000000000000090000000000000000',
	callGasLimit: '0x9bb8',
	verificationGasLimit: '0x2098f',
	preVerificationGas: '0xb718',
	maxPriorityFeePerGas: '0x5f5e100',
	maxFeePerGas: '0x5f676ad',
	paymaster: '0xcd1c62f36a99f306948db76c35bbc1a639f92ce8',
	paymasterVerificationGasLimit: '0x2f6a',
	paymasterPostOpGasLimit: '0x0',
	paymasterData: '0x',
	signature:
		'0x00ba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c',
}
const userOp = fromUserOpHex(formattedUserOp)

console.log('packUserOp', packUserOp(userOp))

const userOpHash = getUserOpHashV07(userOp, 11155111n)
console.log('userOpHash', userOpHash)

const rpcProvider = new RpcProvider(bundlerUrl)
const response = await rpcProvider.send({
	method: 'eth_sendUserOperation',
	params: [userOp, ADDRESS.EntryPointV07],
})

console.log(response)
