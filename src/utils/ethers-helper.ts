import { SendopError } from '@/error'
import type { ParamType } from 'ethers'
import { AbiCoder, getAddress, hexlify, Interface, randomBytes, zeroPadBytes, zeroPadValue } from 'ethers'

export const ERC7579Interface = new Interface([
	'function installModule(uint256 moduleType, address module, bytes calldata initData)',
	'function uninstallModule(uint256 moduleType, address module, bytes calldata deInitData)',
])

/**
 * @param length bytes length
 * @returns hex string
 */
export function zeroBytes(length: number) {
	return '0x' + '00'.repeat(length)
}

/**
 * Remove the function selector from the calldata
 * @param callData hex string
 * @returns hex string
 */
export function getEncodedFunctionParams(callData: string) {
	return '0x' + callData.slice(10)
}

export function randomAddress() {
	return hexlify(randomBytes(20))
}

export function randomBytes32() {
	return hexlify(randomBytes(32))
}

export function is32BytesHexString(data: string) {
	return data.startsWith('0x') && data.length === 66
}

export function isHexString(data: string, bytesLength: number) {
	const expectedLength = bytesLength * 2 + 2
	return data.startsWith('0x') && data.length === expectedLength
}

// TODO: rename with zeroPadLeft
export function padLeft(data: string, length: number = 32) {
	if (!data.startsWith('0x')) {
		throw new EthersHelperError('data must start with 0x in padLeft')
	}
	if (data.length % 2 !== 0) {
		data = data.slice(0, 2) + '0' + data.slice(2)
	}
	return zeroPadValue(data, length)
}

// TODO: rename with zeroPadRight
export function padRight(data: string, length: number = 32) {
	if (!data.startsWith('0x')) {
		throw new EthersHelperError('data must start with 0x in padRight')
	}
	if (data.length % 2 !== 0) {
		data = data.slice(0, 2) + '0' + data.slice(2)
	}
	return zeroPadBytes(data, length)
}

export function abiEncode(types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>): string {
	return new AbiCoder().encode(types, values)
}

export function isSameAddress(address1: string, address2: string) {
	return getAddress(address1) === getAddress(address2)
}

export class EthersHelperError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'EthersHelperError'
	}
}
