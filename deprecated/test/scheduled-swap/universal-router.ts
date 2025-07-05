import { INTERFACES } from '@/interfaces'
import { abiEncode, zeroPadLeft } from '@/utils'
import { concat, Contract, formatEther, parseEther, toBeHex } from 'ethers'
import { setupCLI } from 'test/utils'

const { client, signer } = await setupCLI(['r', 'p'])

const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
// Universal Router address (mainnet/sepolia)
const UNIVERSAL_ROUTER = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'
const amountIn = parseEther('1')

// balance check and approve WETH
const weth = new Contract(WETH, INTERFACES.IERC20, signer)

const balance = await weth.balanceOf(signer.address)
console.log('WETH balance:', formatEther(balance))
if (balance < amountIn) {
	throw new Error('Insufficient WETH balance')
}

const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
// const revokeTx = await weth.approve(UNIVERSAL_ROUTER, 0)
// const revokeReceipt = await revokeTx.wait()
// console.log(revokeReceipt)

const allowance = await weth.allowance(signer.address, PERMIT2)
console.log('allowance to permit2', formatEther(allowance))

if (allowance < amountIn) {
	const approveTx = await weth.approve(PERMIT2, amountIn)
	const approveReceipt = await approveTx.wait()
	console.log(approveReceipt)
}

// if (allowance < parseEther('2')) {
// 	const approveTx = await weth.approve(UNIVERSAL_ROUTER, parseEther('2'))
// 	const approveReceipt = await approveTx.wait()
// 	console.log(approveReceipt)
// }

const universalRouter = new Contract(
	UNIVERSAL_ROUTER,
	[`function execute(bytes calldata commands, bytes[] calldata inputs) external payable`],
	signer,
)

// Command constants
const V3_SWAP_EXACT_IN = '0x00'

// Encode V3 swap parameters
const recipient = signer.address
const amountOutMinimum = 0n
const fee = 3000n

// Path: tokenIn (20 bytes) + fee (3 bytes) + tokenOut (20 bytes)
const path = concat([WETH, zeroPadLeft(toBeHex(fee), 3), USDC])
const payerIsUser = true

const swapInput = abiEncode(
	['address', 'uint256', 'uint256', 'bytes', 'bool'],
	[recipient, amountIn, amountOutMinimum, path, payerIsUser],
)

try {
	const tx = await universalRouter.execute(V3_SWAP_EXACT_IN, [swapInput], {
		// gasLimit: 300000,
	})
	const receipt = await tx.wait()
	console.log(receipt)
} catch (error: any) {
	console.log(error.message)
	if (error.reason) console.log('Reason:', error.reason)
	if (error.data) console.log('Data:', error.data)
}
