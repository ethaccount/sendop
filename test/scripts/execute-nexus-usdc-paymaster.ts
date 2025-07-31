import { IERC1271__factory, IERC20__factory } from '@/contract-types'
import { ERC4337Bundler, type TypedData } from '@/core'
import { ADDRESS, ERC1271_INVALID, ERC1271_MAGICVALUE, NexusAPI } from '@/index'
import { getPermitTypedData } from '@/utils'
import { formatUnits, getBigInt, getBytes, JsonRpcProvider, parseUnits, TypedDataEncoder, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'

export const USDC_PAYMASTESR_ADDRESS = '0x31BE08D380A21fc740883c0BC434FcFc88740b58' // v0.7
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // base sepolia

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}

const CHAIN_ID = 84532 // base sepolia

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)

const signer = new Wallet(DEV_7702_PK)
console.log('signer', signer.address)

const ACCOUNT_ADDRESS = '0xe1dD0a7676093A1c47E947b6cBedBCDfec4C6D94'

console.log('account', ACCOUNT_ADDRESS)

const usdc = IERC20__factory.connect(USDC_ADDRESS, client)
const allowance = await usdc.allowance(ACCOUNT_ADDRESS, USDC_PAYMASTESR_ADDRESS)

console.log('USDC allowance to paymaster', formatUnits(allowance, 6), 'USDC')

const permitAmount = parseUnits('1', 6)

const typedData = await getPermitTypedData({
	client,
	tokenAddress: USDC_ADDRESS,
	chainId: getBigInt(CHAIN_ID),
	ownerAddress: ACCOUNT_ADDRESS,
	spenderAddress: USDC_PAYMASTESR_ADDRESS,
	amount: permitAmount,
})

const sig = await NexusAPI.sign1271({
	validatorAddress: ADDRESS.OwnableValidator,
	typedData,
	signTypedData: async (typedData: TypedData) => {
		return await signer.signMessage(getBytes(TypedDataEncoder.hash(...typedData)))
	},
})

console.log('sig', sig)

const contract = IERC1271__factory.connect(ACCOUNT_ADDRESS, client)
try {
	const calldata = contract.interface.encodeFunctionData('isValidSignature', [
		TypedDataEncoder.hash(...typedData),
		sig,
	])
	console.log('calldata', calldata)
	const result = await contract.isValidSignature(TypedDataEncoder.hash(...typedData), sig)

	if (result === ERC1271_MAGICVALUE) {
		console.log('signature is valid')
	} else if (result === ERC1271_INVALID) {
		throw new Error('Invalid signature')
	} else {
		throw new Error('Failed to verify signature')
	}
} catch (e) {
	if (e instanceof Error && e.message.includes('could not decode result data')) {
		throw new Error('Account may not be deployed')
	}
	throw e
}
