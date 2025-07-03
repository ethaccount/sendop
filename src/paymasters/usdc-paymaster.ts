import { TIERC20__factory } from '@/contract-types'
import type { PaymasterAPI } from '@/types'
import { getPermitTypedData, zeroBytes } from '@/utils'
import type { BigNumberish } from 'ethers'
import {
	concat,
	Contract,
	formatUnits,
	getBigInt,
	Interface,
	parseUnits,
	toBeHex,
	zeroPadValue,
	type JsonRpcProvider,
} from 'ethers'
import type { TypedData } from 'ethers-erc4337'

export const USDC_PAYMASTESR_ADDRESS = '0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966' // v0.8
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // sepolia

export async function createUSDCPaymaster({
	client,
	chainId,
	accountAddress,
	paymasterAddress = USDC_PAYMASTESR_ADDRESS,
	usdcAddress = USDC_ADDRESS,
	permitAmount = parseUnits('1', 6),
	minAllowanceThreshold = parseUnits('1', 6),
	signTypedData,
}: {
	client: JsonRpcProvider
	chainId: BigNumberish
	accountAddress: string
	paymasterAddress?: string
	usdcAddress?: string
	permitAmount?: bigint
	minAllowanceThreshold?: bigint
	signTypedData: (typedData: TypedData) => Promise<string>
}): Promise<PaymasterAPI> {
	// Create paymaster contract and get post-op gas limit
	const usdcPaymaster = new Contract(
		paymasterAddress,
		new Interface(['function additionalGasCharge() view returns (uint256)']),
		client,
	)
	const paymasterPostOpGasLimit = (await usdcPaymaster['additionalGasCharge()']()) as bigint

	// Check current allowance
	const usdc = TIERC20__factory.connect(usdcAddress, client)
	const allowance = await usdc.allowance(accountAddress, paymasterAddress)

	console.log('USDC allowance to paymaster', formatUnits(allowance, 6), 'USDC')

	let paymasterData = concat(['0x00', usdcAddress, zeroBytes(32)])

	if (allowance < minAllowanceThreshold) {
		console.log(
			`allowance is less than ${formatUnits(
				minAllowanceThreshold,
				6,
			)} USDC, sign permit signature to permit ${formatUnits(permitAmount, 6)} USDC more to paymaster`,
		)

		const totalPermitAmount = allowance + permitAmount

		const typedData = await getPermitTypedData({
			client,
			tokenAddress: usdcAddress,
			chainId: getBigInt(chainId),
			ownerAddress: accountAddress,
			spenderAddress: paymasterAddress,
			amount: totalPermitAmount,
		})

		const permitSig = await signTypedData(typedData)

		// paymasterData = 0x00 || usdc address || permitAmount || permitSignature
		paymasterData = concat(['0x00', usdcAddress, zeroPadValue(toBeHex(totalPermitAmount), 32), permitSig])
	}

	return {
		getPaymaster: () => Promise.resolve(paymasterAddress),
		getPaymasterData: () => Promise.resolve(paymasterData),
		getPaymasterPostOpGasLimit: () => Promise.resolve(paymasterPostOpGasLimit),
	}
}
