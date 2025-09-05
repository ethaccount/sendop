import { KernelAccountAPI } from '@/accounts'
import { ADDRESS } from '@/addresses'
import { ERC4337Bundler } from '@/core'
import type {
	GetPaymasterDataParams,
	GetPaymasterDataResult,
	GetPaymasterStubDataParams,
	GetPaymasterStubDataResult,
} from '@/erc7677-types'
import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { INTERFACES } from '@/interfaces'
import { isSameAddress } from '@/utils'
import { getECDSAValidator } from '@/validations/getECDSAValidator'
import { SingleEOAValidation } from '@/validations/SingleEOAValidation'
import { getAddress, getBytes, JsonRpcProvider, toBeHex, Wallet } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'
import { buildAccountExecutions } from '../helpers'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', DEV_7702_PK = '', CANDIDE_API_KEY = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}
if (!CANDIDE_API_KEY) {
	throw new Error('CANDIDE_API_KEY is not set')
}

const CHAIN_ID = 84532

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const pimlicoUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)
const candideUrl = `https://api.candide.dev/api/v3/${CHAIN_ID}/${CANDIDE_API_KEY}`
const paymasterUrl = `https://api.candide.dev/paymaster/v3/base-sepolia/${CANDIDE_API_KEY}`

const client = new JsonRpcProvider(rpcUrl)
const bundler = new ERC4337Bundler(candideUrl, undefined, {
	batchMaxCount: 1, // candide doesn't support rpc batching
})
const paymasterClient = new JsonRpcProvider(paymasterUrl, CHAIN_ID, {
	staticNetwork: true,
	batchMaxCount: 1,
})

const signer = new Wallet(DEV_7702_PK)

const ecdsaValidator = getECDSAValidator({ ownerAddress: signer.address })

const accountAddress = '0x960CBf515F3DcD46f541db66C76Cf7acA5BEf4C7'

const kernelAPI = new KernelAccountAPI({
	validation: new SingleEOAValidation(),
	validatorAddress: ecdsaValidator.address,
})

const executions = [
	{
		to: ADDRESS.Counter,
		value: 0n,
		data: INTERFACES.Counter.encodeFunctionData('increment'),
	},
]

const op = await buildAccountExecutions({
	accountAPI: kernelAPI,
	accountAddress,
	chainId: CHAIN_ID,
	client,
	bundler,
	executions,
})

if (!op.entryPointAddress) {
	throw new Error('Entry point address is not set')
}

const entryPointAddress = getAddress(op.entryPointAddress)

const supportedEntryPoints = await paymasterClient.send('pm_supportedEntryPoints', [])

if (!supportedEntryPoints.some((entryPoint: string) => isSameAddress(entryPoint, entryPointAddress))) {
	throw new Error('Entry point not supported by paymaster')
}

const params: GetPaymasterStubDataParams = [
	op.hex(),
	getAddress(op.entryPointAddress),
	toBeHex(CHAIN_ID),
	{ sponsorshipPolicyId: 'f0785f78e6678a99' },
]

const paymasterStubData: GetPaymasterStubDataResult | null = await paymasterClient.send(
	'pm_getPaymasterStubData',
	params,
)

if (!paymasterStubData) {
	throw new Error('Paymaster stub data is falsy')
}
console.log('paymasterStubData', paymasterStubData)

op.setPaymaster(paymasterStubData)

op.setGasPrice(await fetchGasPricePimlico(pimlicoUrl))

await op.estimateGas()

if (!paymasterStubData.isFinal) {
	const params: GetPaymasterDataParams = [
		op.hex(),
		op.entryPointAddress,
		toBeHex(CHAIN_ID),
		{ sponsorshipPolicyId: 'f0785f78e6678a99' },
	]
	const paymasterData: GetPaymasterDataResult | null = await paymasterClient.send('pm_getPaymasterData', params)
	console.log('paymasterData', paymasterData)

	if (!paymasterData) {
		throw new Error('Paymaster data is falsy')
	}

	op.setPaymasterData(paymasterData.paymasterData)
}

const sig = await signer.signMessage(getBytes(op.hash()))

op.setSignature(await kernelAPI.formatSignature(sig))

await op.send()
const receipt = await op.wait()
console.log('receipt', receipt.success)
