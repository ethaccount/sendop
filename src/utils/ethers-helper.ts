import { SendopError } from '@/error'
import type { ParamType } from 'ethers'
import { AbiCoder, getAddress, hexlify, randomBytes, zeroPadBytes, zeroPadValue } from 'ethers'

/**
 * @param length bytes length
 * @returns hex string
 */
export function zeroBytes(length?: number) {
	if (length === undefined) {
		return '0x'
	}
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

export function getBytesLength(data: string) {
	if (!isBytes(data)) {
		return 0
	}
	return (data.length - 2) / 2
}

export function isBytes(data: string, bytesLength?: number) {
	if (bytesLength && data.length !== bytesLength * 2 + 2) {
		return false
	}
	if (!data.startsWith('0x')) {
		return false
	}
	if (data.length > 2 && !/^0x[0-9a-fA-F]+$/.test(data)) {
		return false
	}
	if (data.length % 2 !== 0) {
		return false
	}
	return true
}

export function isBytes32(data: string) {
	return isBytes(data, 32)
}

export function zeroPadLeft(data: string, length: number = 32) {
	if (!isBytes(data)) {
		throw new InvalidHexStringError()
	}
	return zeroPadValue(data, length)
}

export function zeroPadRight(data: string, length: number = 32) {
	if (!isBytes(data)) {
		throw new InvalidHexStringError()
	}
	return zeroPadBytes(data, length)
}

export function abiEncode(types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>): string {
	return new AbiCoder().encode(types, values)
}

export function isSameAddress(address1: string, address2: string) {
	return getAddress(address1) === getAddress(address2)
}

export class InvalidHexStringError extends SendopError {
	constructor(message?: string, cause?: Error) {
		super(message ?? 'Invalid hex string', cause)
		this.name = 'InvalidHexStringError'
	}
}
