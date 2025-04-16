import { connectEntryPointV07 } from '@/utils/contract-helper'
import { formatEther, JsonRpcProvider, parseEther, Wallet } from 'ethers'
import { setup } from './utils/setup'
import { ADDRESS } from '@/addresses'

const { CLIENT_URL, privateKey, chainId, logger } = await setup({ chainId: 1337n })

logger.info(`Chain ID: ${chainId}`)

const provider = new JsonRpcProvider(CLIENT_URL)
const signer = new Wallet(privateKey, provider)
const entryPoint = connectEntryPointV07(signer)

const balance = await entryPoint.balanceOf(ADDRESS.PublicPaymaster)
logger.info(`Balance: ${formatEther(balance)}`)

// prompt confirmation

const confirmed = prompt('Confirm? (y/n)')
if (confirmed !== 'y') {
	process.exit()
}

const tx = await entryPoint.depositTo(ADDRESS.PublicPaymaster, { value: parseEther('1') })
const receipt = await tx.wait()

console.log('receipt status', receipt?.status)
