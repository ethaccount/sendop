import { ADDRESS } from '@/addresses'
import { IERC20__factory } from '@/contract-types'
import { KernelV3Account } from '@/smart-accounts'
import { zeroPadLeft } from '@/utils'
import { formatUnits } from 'ethers'
import { parseUnits, toBeHex } from 'ethers'
import { setupCLI } from 'test/utils'

/*

bun run test/usdc-paymaster/send-usdc.ts -r $arbitrumSepolia -p $devpk

*/

const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'

const { client, signer } = await setupCLI(['r', 'p'], {
	bundlerOptions: {
		skipGasEstimation: true,
	},
})

const usdc = IERC20__factory.connect(USDC_ADDRESS, signer)

const creationOptions = {
	salt: zeroPadLeft(toBeHex(123n)),
	validatorAddress: ADDRESS.ECDSAValidator,
	validatorInitData: process.env.acc0 as string,
}

const computedAddress = KernelV3Account.computeAccountAddress(client, creationOptions)

const tx = await usdc.transfer(computedAddress, parseUnits('1', 6))
const receipt = await tx.wait()

console.log('receipt.status', receipt?.status)

const balance = await usdc.balanceOf(computedAddress)
console.log('balance', formatUnits(balance, 6))
