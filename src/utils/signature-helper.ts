import type { TypedDataDomain, TypedDataField } from 'ethers'

export const ERC1271_MAGIC_VALUE = '0x1626ba7e'
export const ERC1271_INVALID = '0xffffffff'

export type TypedData = [TypedDataDomain, Record<string, Array<TypedDataField>>, Record<string, any>]
