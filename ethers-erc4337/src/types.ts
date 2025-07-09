import { type TypedDataDomain, type TypedDataField } from 'ethers'

export type TypedData = [TypedDataDomain, TypedDataTypes, TypedDataValues]
export type TypedDataTypes = Record<string, Array<TypedDataField>>
export type TypedDataValues = Record<string, any>

export const ERC1271_MAGIC_VALUE = '0x1626ba7e'
export const ERC1271_INVALID = '0xffffffff'
