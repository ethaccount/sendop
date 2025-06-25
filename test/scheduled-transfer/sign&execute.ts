import {
	ADDRESS,
	AlchemyBundler,
	DUMMY_ECDSA_SIGNATURE,
	fromUserOpHex,
	getUserOpHashV07,
	packUserOp,
	RpcProvider,
	sendUserOp,
	type UserOperationHex,
} from '@/index'
import { concat, getBytes, Wallet } from 'ethers'
import { getBundlerUrl } from '../../test/utils'

const privateKey = process.env.acc1pk
const wallet = new Wallet(privateKey as string)

const bundlerUrl = getBundlerUrl(11155111n, { type: 'alchemy' })
const bundler = new AlchemyBundler(11155111n, bundlerUrl, { debug: true })

const entryPointAddress = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'

const formattedUserOp: UserOperationHex = {
	sender: '0x47D6a8A65cBa9b61B194daC740AA192A7A1e91e1',
	nonce: '0x0100000000002b0ecfbd0496ee71e01257da0e37de00000000000000000002',
	callData:
		'0xe9ae5c53000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000058a8e374779aee60413c974b484d6509c7e4ddb6ba000000000000000000000000000000000000000000000000000000000000000094f6113400000000000000000000000000000000000000000000000000000000000000090000000000000000',
	callGasLimit: '0x00',
	verificationGasLimit: '0x00',
	preVerificationGas: '0x00',
	maxFeePerGas: '0x00',
	maxPriorityFeePerGas: '0x00',
	paymaster: ADDRESS.PublicPaymaster,
	paymasterVerificationGasLimit: '0x00',
	paymasterPostOpGasLimit: '0x00',
	paymasterData: '0x',
	signature: '0x00ba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957',
}

const leadingSignature = '0x00ba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'

formattedUserOp.signature = concat([formattedUserOp.signature, DUMMY_ECDSA_SIGNATURE])

const userOp = fromUserOpHex(formattedUserOp)

console.log('userOpHash', getUserOpHashV07(userOp, 11155111n))

const rpcProvider = new RpcProvider(bundlerUrl)
const response = await rpcProvider.send({
	method: 'eth_estimateUserOperationGas',
	params: [formattedUserOp, entryPointAddress],
})

console.log('estimateUserOperationGas', response)

const gasValues = await bundler.getGasValues(userOp)
userOp.maxFeePerGas = gasValues.maxFeePerGas
userOp.maxPriorityFeePerGas = gasValues.maxPriorityFeePerGas
userOp.preVerificationGas = gasValues.preVerificationGas
userOp.verificationGasLimit = gasValues.verificationGasLimit
userOp.callGasLimit = gasValues.callGasLimit
userOp.paymasterVerificationGasLimit = gasValues.paymasterVerificationGasLimit
	? gasValues.paymasterVerificationGasLimit
	: 0n

const userOpHash = getUserOpHashV07(userOp, bundler.chainId)
const signature = await wallet.signMessage(getBytes(userOpHash))
userOp.signature = concat([leadingSignature, signature])

const op = await sendUserOp(bundler, userOp)
const result = await op.wait()

console.log(result)
