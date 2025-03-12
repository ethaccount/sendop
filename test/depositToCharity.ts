import { connectEntryPointV07 } from '@/utils/contract-getter'
import { formatEther, JsonRpcProvider, parseEther, Wallet } from 'ethers'
import { setup } from './utils/setup'
import ADDRESS from '@/addresses'

const { CLIENT_URL, privateKey, chainId, logger } = await setup()

logger.info(`Chain ID: ${chainId}`)

const provider = new JsonRpcProvider(CLIENT_URL)
const signer = new Wallet(privateKey, provider)
const entryPoint = connectEntryPointV07(signer)

const balance = await entryPoint.balanceOf(ADDRESS.CharityPaymaster)
logger.info(`Balance: ${formatEther(balance)}`)

// prompt confirmation

const confirmed = prompt('Confirm? (y/n)')
if (confirmed !== 'y') {
	process.exit()
}

const tx = await entryPoint.depositTo(ADDRESS.CharityPaymaster, { value: parseEther('0.5') })
const receipt = await tx.wait()

console.log(receipt?.status)
