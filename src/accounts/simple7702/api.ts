import type { TypedData } from '@/core'

export class Simple7702API {
	static async sign1271({
		typedData,
		signTypedData,
	}: {
		typedData: TypedData
		signTypedData: (typedData: TypedData) => Promise<string>
	}) {
		return await signTypedData(typedData)
	}
}
