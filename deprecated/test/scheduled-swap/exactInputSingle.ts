import { INTERFACES } from '@/interfaces'
import { Contract, formatEther, parseEther } from 'ethers'
import { setupCLI } from 'test/utils'

const { client, signer } = await setupCLI(['r', 'p'])

const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
const SWAP_ROUTER = '0x65669fE35312947050C450Bd5d36e6361F85eC12'
const amountIn = parseEther('0.001')

// balance check and approve WETH
const weth = new Contract(WETH, INTERFACES.IERC20, signer)

const balance = await weth.balanceOf(signer.address)
console.log('WETH balance:', formatEther(balance))
if (balance < amountIn) {
	throw new Error('Insufficient WETH balance')
}

const allowance = await weth.allowance(signer.address, SWAP_ROUTER)
console.log('allowance', formatEther(allowance))

if (allowance < amountIn) {
	const approveTx = await weth.approve(SWAP_ROUTER, amountIn)
	const approveReceipt = await approveTx.wait()
	console.log(approveReceipt.status === 1 ? 'Success' : 'Failed')

	const allowance = await weth.allowance(signer.address, SWAP_ROUTER)
	console.log('allowance', formatEther(allowance))
}

const swapRouter = new Contract(
	SWAP_ROUTER,
	[
		`function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)`,
	],
	signer,
)

const sqrtPriceLimitX96 = 0n
const amountOutMinimum = 0n
const fee = 500n

const params = {
	tokenIn: WETH,
	tokenOut: USDC,
	fee: fee,
	recipient: signer.address,
	deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
	amountIn: amountIn,
	amountOutMinimum: amountOutMinimum,
	sqrtPriceLimitX96: sqrtPriceLimitX96,
}

try {
	const tx = await swapRouter.exactInputSingle(params)
	const receipt = await tx.wait()
	console.log(receipt)
} catch (error: any) {
	console.log(error)
}
