import type { BytesLike } from 'ethers'

export interface IERC1271Interface {
	signERC1271(dataHash: BytesLike): Promise<string>
}
