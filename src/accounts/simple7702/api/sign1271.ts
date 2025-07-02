export async function sign1271({
	hash,
	signHash,
}: {
	hash: Uint8Array
	signHash: (hash: Uint8Array) => Promise<string>
}) {
	return await signHash(hash)
}
