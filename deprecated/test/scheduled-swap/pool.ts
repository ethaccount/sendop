import { INTERFACES } from '@/interfaces'
import { Contract, formatEther, formatUnits } from 'ethers'
import { setupCLI } from 'test/utils'
import { calcPrice, USDC, WETH } from './utils'

const { client } = await setupCLI(['r'])

const USDC_WETH_POOL_500 = '0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1' // fee 500
const USDC_WETH_POOL_3000 = '0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50' // fee 3000

const poolAbi = [
	'function liquidity() external view returns (uint128)',
	'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
]

const pool500 = new Contract(USDC_WETH_POOL_500, poolAbi, client)
const pool3000 = new Contract(USDC_WETH_POOL_3000, poolAbi, client)

const weth = new Contract(WETH, INTERFACES.IERC20, client)
const wethBalance500 = await weth.balanceOf(USDC_WETH_POOL_500)
console.log('wethBalance500', formatEther(wethBalance500))
const wethBalance3000 = await weth.balanceOf(USDC_WETH_POOL_3000)
console.log('wethBalance3000', formatEther(wethBalance3000))

const usdc = new Contract(USDC, INTERFACES.IERC20, client)
const usdcBalance500 = await usdc.balanceOf(USDC_WETH_POOL_500)
console.log('usdcBalance500', formatUnits(usdcBalance500, 6))
const usdcBalance3000 = await usdc.balanceOf(USDC_WETH_POOL_3000)
console.log('usdcBalance3000', formatUnits(usdcBalance3000, 6))

// Get current pool state
const slot0500 = await pool500.slot0()
const sqrtPriceX96500 = slot0500.sqrtPriceX96
const liquidity500 = await pool500.liquidity()
console.log('pool 500 price', calcPrice(sqrtPriceX96500, 6, 18))
console.log('pool 500 liquidity', liquidity500)

const slot03000 = await pool3000.slot0()
const sqrtPriceX963000 = slot03000.sqrtPriceX96
const liquidity3000 = await pool3000.liquidity()
console.log('pool 3000 price', calcPrice(sqrtPriceX963000, 6, 18))
console.log('pool 3000 liquidity', liquidity3000)
