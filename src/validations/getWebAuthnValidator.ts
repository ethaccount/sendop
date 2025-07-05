import { ADDRESS } from '@/addresses'
import type { ERC7579Module } from '@/erc7579'
import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { abiEncode } from '@/utils'
import type { BytesLike } from 'ethers'

export function getWebAuthnValidator({
	pubKeyX,
	pubKeyY,
	authenticatorIdHash,
}: {
	pubKeyX: bigint
	pubKeyY: bigint
	authenticatorIdHash: BytesLike
}): ERC7579Module {
	const initData = abiEncode(
		['tuple(uint256 pubKeyX, uint256 pubKeyY)', 'bytes32'],
		[{ pubKeyX, pubKeyY }, authenticatorIdHash],
	)

	return {
		address: ADDRESS.WebAuthnValidator,
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		initData,
		deInitData: '0x',
	}
}
