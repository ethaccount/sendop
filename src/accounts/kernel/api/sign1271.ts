import type { BigNumberish } from 'ethers'
import { concat, getBytes, TypedDataEncoder } from 'ethers'
import { type TypedData } from '@/core'

export async function sign1271({
	version = '0.3.3',
	validator,
	hash,
	chainId,
	accountAddress,
	signHash,
}: {
	version: '0.3.3' | '0.3.1'
	validator: string
	hash: Uint8Array
	chainId: BigNumberish
	accountAddress: string
	signHash: (hash: Uint8Array) => Promise<string>
}) {
	const typedData: TypedData = [
		{
			name: 'Kernel',
			version,
			chainId,
			verifyingContract: accountAddress,
		},
		{
			Kernel: [{ name: 'hash', type: 'bytes32' }],
		},
		{
			hash: hash,
		},
	]

	const sig = await signHash(getBytes(TypedDataEncoder.hash(...typedData)))

	return concat([
		'0x01', // validator mode
		validator,
		sig,
	])
}
