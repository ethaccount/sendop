export function sortAndUniquifyAddresses(addresses: string[]): string[] {
	const uniqueAddresses = [...new Set(addresses.map(addr => addr.toLowerCase()))]

	return uniqueAddresses.sort((a, b) => {
		const addrA = a.startsWith('0x') ? a.slice(2) : a
		const addrB = b.startsWith('0x') ? b.slice(2) : b

		return addrA.localeCompare(addrB)
	})
}
