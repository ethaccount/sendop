import { Contract, Interface, JsonRpcProvider } from 'ethers'
import { zeroPadLeft } from './ethers-helper'

export function findPrevious(array: string[], entry: string): string {
	for (let i = 0; i < array.length; i++) {
		if (array[i].toLowerCase() === entry.toLowerCase()) {
			if (i === 0) {
				return zeroPadLeft('0x01', 20)
			} else {
				return array[i - 1]
			}
		}
	}
	throw new Error('[findPrevious] Entry not found in array')
}

export async function getValidatorsPaginated(
	client: JsonRpcProvider,
	accountAddress: string,
	cursor: string,
	size: number,
) {
	const iface = new Interface([
		'function getValidatorsPaginated(address cursor, uint256 size) external view returns (address[] memory array, address next)',
	])
	const contract = new Contract(accountAddress, iface, client)
	const { array, next } = (await contract.getValidatorsPaginated(cursor, size)) as { array: string[]; next: string }
	return { validators: array, next }
}
