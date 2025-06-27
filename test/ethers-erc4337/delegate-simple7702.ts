import { JsonRpcProvider, verifyAuthorization, Wallet } from 'ethers'
import { ERC4337Bundler } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', dev7702 = '', dev7702pk = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

if (!dev7702) {
	throw new Error('dev7702 is not set')
}

if (!dev7702pk) {
	throw new Error('dev7702pk is not set')
}

export const INITCODE_EIP7702_MARKER = '0x7702'
const SIMPLE_7702_ACCOUNT = '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9'
const CHAIN_ID = 11155111

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)

const owner = new Wallet(dev7702pk, client)

// sign eip-7702 auth

const auth = await owner.authorize({
	address: dev7702,
	nonce: await client.getTransactionCount(dev7702),
	chainId: CHAIN_ID,
})

console.log('verifyAuthorization', verifyAuthorization(auth, auth.signature) === dev7702)

// send eip-7702 auth using bundler
