import fs from 'fs'
import {
	ECDSA_VALIDATOR,
	ENTRY_POINT_V07,
	ERC20_SPENDING_LIMIT_POLICY,
	K1_VALIDATOR,
	KERNEL_FACTORY,
	MY_ACCOUNT_FACTORY,
	REGISTRY,
	SMART_SESSION,
	SUDO_POLICY,
	UNI_ACTION_POLICY,
	WEB_AUTHN_VALIDATOR,
} from '../src/address'
import { fetchABI } from './common'

async function main() {
	const addresses = [
		ENTRY_POINT_V07,
		REGISTRY,
		KERNEL_FACTORY,
		MY_ACCOUNT_FACTORY,
		ECDSA_VALIDATOR,
		K1_VALIDATOR,
		WEB_AUTHN_VALIDATOR,
		SMART_SESSION,
		SUDO_POLICY,
		UNI_ACTION_POLICY,
		ERC20_SPENDING_LIMIT_POLICY,
	]

	console.log('Fetching ABIs...')

	for (const address of addresses) {
		try {
			await fetchABI(address, 'sepolia')
			console.log(`Successfully fetched ABI for ${address}`)
		} catch (error) {
			console.error(`Failed to fetch ABI for ${address}:`, error)
		}
	}

	console.log('Done fetching ABIs')

	console.log('Setting EntryPoint.json to EntryPointV07.json')
	fs.renameSync('src/abis/EntryPoint.json', 'src/abis/EntryPointV07.json')
}

main().catch(console.error)
