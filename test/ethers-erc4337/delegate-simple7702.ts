import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { fetchGasPriceAlchemy } from '@/fetchGasPrice'
import { JsonRpcProvider, verifyAuthorization, Wallet } from 'ethers'
import { ENTRY_POINT_V08_ADDRESS, EntryPointV08__factory, ERC4337Bundler } from 'ethers-erc4337'
import { alchemy, pimlico } from 'evm-providers'
import { UserOpBuilder } from 'ethers-erc4337'

// Failed. Don't know why.

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

const SIMPLE_7702_ACCOUNT = '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9'
const CHAIN_ID = 11155111

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(bundlerUrl)

const entryPointAddress = ENTRY_POINT_V08_ADDRESS
const entryPoint = EntryPointV08__factory.connect(entryPointAddress, client)

const owner = new Wallet(dev7702pk, client)

// sign eip-7702 auth

const eip7702Nonce = await client.getTransactionCount(dev7702)

const auth = await owner.authorize({
	address: SIMPLE_7702_ACCOUNT,
	nonce: eip7702Nonce,
	chainId: CHAIN_ID,
})

console.log('auth', auth)

console.log('verifyAuthorization', verifyAuthorization(auth, auth.signature) === dev7702)

async function main() {
	const userop = new UserOpBuilder(bundler, entryPointAddress, CHAIN_ID)
		.setSender(dev7702)
		.setEIP7702Auth({
			chainId: CHAIN_ID,
			address: SIMPLE_7702_ACCOUNT,
			nonce: eip7702Nonce,
			yParity: auth.signature.yParity,
			r: auth.signature.r,
			s: auth.signature.s,
		})
		.setNonce(await entryPoint.getNonce(dev7702, 0n))
		.setGasPrice(await fetchGasPriceAlchemy(rpcUrl))
		.setSignature(DUMMY_ECDSA_SIGNATURE)
		.setPaymaster({
			paymaster: ADDRESS.PublicPaymaster,
		})

	console.log('userop', userop.preview())

	await userop.estimateGas()

	await userop.signUserOpTypedData(typedData => owner.signTypedData(...typedData))

	console.log(userop.hex())
	console.log(userop.pack())
	console.log(userop.encodeHandleOpsData())

	const hash = await userop.send()
	console.log('sent', hash)

	const receipt = await userop.wait()
	console.log('success', receipt.success)
}

main().catch(e => console.error(e.message))
