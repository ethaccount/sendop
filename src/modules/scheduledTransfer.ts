import { concat, toBeHex } from 'ethers'
import { abiEncode, zeroPadLeft } from '../utils/ethers-helper'

export type ScheduledTransferParams = {
	executeInterval: number
	numOfExecutions: number
	startDate: number
	recipient: string
	token: string
	amount: bigint
}

/**
 * @dev initData: executeInterval (6) ++ numOfExecutions (2) ++ startDate (6) ++ executionData
 */
export function getScheduledTransferInitData({
	executeInterval,
	numOfExecutions,
	startDate,
	recipient,
	token,
	amount,
}: ScheduledTransferParams): string {
	return concat([
		zeroPadLeft(toBeHex(executeInterval), 6),
		zeroPadLeft(toBeHex(numOfExecutions), 2),
		zeroPadLeft(toBeHex(startDate), 6),
		abiEncode(['address', 'address', 'uint256'], [recipient, token, toBeHex(amount)]),
	])
}

export function getScheduledTransferDeInitData(): string {
	return '0x'
}
