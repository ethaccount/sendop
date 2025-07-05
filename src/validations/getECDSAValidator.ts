import { ADDRESS } from '@/addresses'
import type { ERC7579Module } from '@/erc7579'
import { ERC7579_MODULE_TYPE } from '@/erc7579'

export function getECDSAValidator({ ownerAddress }: { ownerAddress: string }): ERC7579Module {
	return {
		address: ADDRESS.ECDSAValidator,
		type: ERC7579_MODULE_TYPE.VALIDATOR,
		initData: ownerAddress,
		deInitData: '0x',
	}
}
