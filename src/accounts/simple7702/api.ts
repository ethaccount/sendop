import { sign1271 } from './api/sign1271'

export class Simple7702API {
	static async sign1271({ hash, signHash }: { hash: Uint8Array; signHash: (hash: Uint8Array) => Promise<string> }) {
		return await sign1271({ hash, signHash })
	}
}
