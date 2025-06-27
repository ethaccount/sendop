import { JsonRpcProvider } from 'ethers'
import { alchemy, pimlico } from 'evm-providers'

const KERNEL_V3_3_FACTORY = '0x2577507b78c2008Ff367261CB6285d44ba5eF2E9'

const { ALCHEMY_API_KEY = '', PIMLICO_API_KEY = '', dev7702 = '', dev7702pk = '' } = process.env

if (!ALCHEMY_API_KEY) {
	throw new Error('ALCHEMY_API_KEY is not set')
}
if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}
if (!dev7702) {
	throw new Error('dev7702 is not set')
}

const CHAIN_ID = 11155111

const rpcUrl = alchemy(CHAIN_ID, ALCHEMY_API_KEY)
const bundlerUrl = pimlico(CHAIN_ID, PIMLICO_API_KEY)

const client = new JsonRpcProvider(rpcUrl)

const feeData = await client.getFeeData()
console.log(feeData)
