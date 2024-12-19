export const SESSION_PUBLIC_KEY = '0xb04662Edea81c9BD5717544514e7F2D14B148fF5'
export const OWNER_ADDRESS = '0xd78B5013757Ea4A7841811eF770711e6248dC282'

export const chainIdToNetwork: Record<string, string> = {
	'11155111': 'sepolia',
	'7078815900': 'mekong',
}

export function toNetwork(chainId: string): string {
	return chainIdToNetwork[chainId]
}

export const addresses: Record<string, Record<string, string>> = {
	sepolia: {
		COUNTER: '0x6310534eC64cd001Dd182Ca4cb359E9DB37d4378',
		ENTRY_POINT: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
		SMART_SESSION: '0xCF57f874F2fAd43379ac571bDea61B759baDBD9B',
		SIMPLE_SESSION_VALIDATOR: '0x61246aaA9057c4Df78416Ac1ff047C97b6eF392D',
		SUDO_POLICY: '0x32D14013c953D7409e90ABc482CdC9672C05D371',
		SCHEDULED_TRANSFER: '0x88EA6ae18FBc2bB092c34F59004940E3cb137506',
		ECDSA_VALIDATOR: '0xd577C0746c19DeB788c0D698EcAf66721DC2F7A4',
		ECDSA_VALIDATOR_2: '0x845adb2c711129d4f3966735ed98a9f09fc4ce57', // from Kernel
		WEB_AUTHN_VALIDATOR: '0x612D8c7C35659AE14952695dCc754ca82D874fd3', // from Kernel
		MY_ACCOUNT_FACTORY: '0x7cdf84c1d0915748Df0f1dA6d92701ac6A903E41',
		PAYMASTER: '0xA2E1944eD3294f0202a063cc971ECe09cbd02e43',
		CHARITY_PAYMASTER: '0x3f4Dd392b2a6D703F2A7A6925Ed0138b5b1E9357',
		KERNEL_FACTORY: '0xaac5D4240AF87249B3f71BC8E4A2cae074A3E419',

		// accounts
		MY_ACCOUNT: '0x67ce34bc421060b8594cdd361ce201868845045b',
		KERNEL: '0x41f88637a749c815a31fe2867fbdf59af7b2fceb',
	},
	mekong: {
		COUNTER: '0xa8d4452Ae282FC13521C6A4d91FE58bB49719EB4',
		ENTRY_POINT: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
		// TODO:
		SMART_SESSION: '',
		SIMPLE_SESSION_VALIDATOR: '',
		SUDO_POLICY: '',
		SCHEDULED_TRANSFER: '',
		ECDSA_VALIDATOR: '',
		ECDSA_VALIDATOR_2: '', // from Kernel
		MY_ACCOUNT_FACTORY: '',
		PAYMASTER: '',
		CHARITY_PAYMASTER: '',
		KERNEL_FACTORY: '',
	},
}
