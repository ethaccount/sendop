export class Simple7702API {
	static async sign1271({ hash, signHash }: { hash: Uint8Array; signHash: (hash: Uint8Array) => Promise<string> }) {
		return await signHash(hash)
	}
}
