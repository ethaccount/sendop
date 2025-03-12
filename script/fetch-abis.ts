import fs from 'fs'
import { fetchABI } from './common'
import {
	// Validators
	ECDSA_VALIDATOR,
	// Singleton
	ENTRY_POINT_V0_7,
	ERC20_SPENDING_LIMIT_POLICY,
	K1_VALIDATOR,
	// Smart Account Factories
	KERNEL_FACTORY,
	// Smart Account
	KERNEL_V0_3_1,
	MY_ACCOUNT_FACTORY,
	REGISTRY,
	SCHEDULED_ORDERS,
	// Modules
	SCHEDULED_TRANSFERS,
	// SmartSession Contracts
	SMART_SESSION,
	SUDO_POLICY,
	UNI_ACTION_POLICY,
	WEB_AUTHN_VALIDATOR,
} from '../src/address'

const addresses = [
	// Singleton
	ENTRY_POINT_V0_7,
	REGISTRY,

	// Smart Account Factories
	KERNEL_FACTORY,
	MY_ACCOUNT_FACTORY,

	// Smart Account
	KERNEL_V0_3_1,

	// Validators
	ECDSA_VALIDATOR,
	K1_VALIDATOR,
	WEB_AUTHN_VALIDATOR,

	// SmartSession Contracts
	SMART_SESSION,
	SUDO_POLICY,
	UNI_ACTION_POLICY,
	ERC20_SPENDING_LIMIT_POLICY,

	// Modules
	SCHEDULED_TRANSFERS,
	SCHEDULED_ORDERS,
]

async function main() {
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
