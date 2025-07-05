import { JsonRpcProvider, dataSlice, getAddress, isAddress } from 'ethers'
import { getBytesLength } from './ethers-helper'

export async function getSmartEOADelegateAddress(client: JsonRpcProvider, address: string): Promise<string | null> {
	const code = await client.getCode(address)
	if (code.startsWith('0xef0100') && isAddress(dataSlice(code, 3, 23)) && getBytesLength(code) === 23) {
		return getAddress(dataSlice(code, 3, 23))
	}
	return null
}
