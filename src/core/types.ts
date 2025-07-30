import { type TypedDataDomain, type TypedDataField } from 'ethers'

export type TypedData = [TypedDataDomain, TypedDataTypes, TypedDataValues]
export type TypedDataTypes = Record<string, Array<TypedDataField>>
export type TypedDataValues = Record<string, any>
