import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE, ENTRY_POINT_V08_ADDRESS } from '@/constants'
import { EntryPointV08__factory } from '@/contract-types'
import { ERC4337Bundler, UserOpBuilder } from '@/core'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { JsonRpcProvider, verifyAuthorization, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}

if (!DEV_7702_PK) {
	throw new Error('DEV_7702_PK is not set')
}

const SIMPLE_7702_ACCOUNT = '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9'
const CHAIN_ID = 84532

const alchemyUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(alchemyUrl)
const bundler = new ERC4337Bundler(pimlicoUrl)

const entryPointAddress = ENTRY_POINT_V08_ADDRESS
const entryPoint = EntryPointV08__factory.connect(entryPointAddress, client)

const owner = new Wallet(DEV_7702_PK, client)

// sign eip-7702 auth

const eip7702Nonce = await client.getTransactionCount(owner.address)

const auth = await owner.authorize({
	address: SIMPLE_7702_ACCOUNT,
	nonce: eip7702Nonce,
	chainId: CHAIN_ID,
})

// console.log('auth', auth)

console.log('verifyAuthorization', verifyAuthorization(auth, auth.signature) === owner.address)

const userop = new UserOpBuilder({ chainId: CHAIN_ID, bundler, entryPointAddress })
	.setSender(owner.address)
	.setEIP7702Auth({
		chainId: CHAIN_ID,
		address: SIMPLE_7702_ACCOUNT,
		nonce: eip7702Nonce,
		yParity: auth.signature.yParity,
		r: auth.signature.r,
		s: auth.signature.s,
	})
	.setNonce(await entryPoint.getNonce(owner.address, 0n))
	.setGasPrice(await fetchGasPricePimlico(pimlicoUrl))
	.setSignature(DUMMY_ECDSA_SIGNATURE)
	.setPaymaster({
		paymaster: ADDRESS.PublicPaymaster,
	})

console.log('userop', userop.preview())

await userop.estimateGas()

await userop.signUserOpTypedData(typedData => owner.signTypedData(...typedData))

console.log('userop.hex', userop.hex())
console.log('userop.pack', userop.pack())
console.log('userop.hash', userop.hash())
console.log('userop.encodeHandleOpsData', userop.encodeHandleOpsData())

const hash = await userop.send()
console.log('sent', hash)

const receipt = await userop.wait()
console.log('success', receipt.success)
