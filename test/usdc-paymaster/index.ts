import { ADDRESS } from '@/addresses'
import { IERC20__factory } from '@/contract-types'
import { type GetPaymasterDataResult, type GetPaymasterStubDataResult, type PaymasterGetter, type UserOp } from '@/core'
import { PublicPaymaster } from '@/paymasters'
import { KernelV3Account } from '@/smart-accounts'
import { zeroPadLeft } from '@/utils'
import { EOAValidatorModule } from '@/validators'
import type { JsonRpcProvider, TypedDataDomain } from 'ethers'
import { concat, Contract, formatUnits, Interface, MaxUint256, parseUnits, toBeHex, type TypedDataField } from 'ethers'
import { setupCLI } from 'test/utils'

const PAYMASTESR_ADDRESS = '0x31BE08D380A21fc740883c0BC434FcFc88740b58'
const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'

const MAX_GAS_USDC = parseUnits('6', 6)

/*

bun run test/usdc-paymaster/index.ts -r $arbitrumSepolia

*/

const { client, signer, bundler, chainId } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		// skipGasEstimation: true,
	},
})

const creationOptions = {
	salt: zeroPadLeft(toBeHex(123n)),
	validatorAddress: ADDRESS.ECDSAValidator,
	validatorInitData: signer.address,
}

const computedAddress = await KernelV3Account.getNewAddress(client, creationOptions)

const usdc = IERC20__factory.connect(USDC_ADDRESS, client)

const balance = await usdc.balanceOf(computedAddress)
console.log('balance', formatUnits(balance, 6))

// ensure balance is greater than 5 usdc
if (balance < 2n * 10n ** 6n) {
	throw new Error('balance is less than 5 usdc')
}

class CircleUSDCPaymaster implements PaymasterGetter {
	public readonly options: { client: JsonRpcProvider; chainId: bigint; address: string }

	constructor(options: { client: JsonRpcProvider; chainId: bigint; address: string }) {
		this.options = options
	}

	async getPaymasterStubData(userOp: UserOp): Promise<GetPaymasterStubDataResult> {
		const usdcPaymaster = new Contract(
			this.options.address,
			new Interface(['function additionalGasCharge() view returns (uint256)']),
			this.options.client,
		)
		const additionalGasCharge = await usdcPaymaster.getFunction('additionalGasCharge')()
		console.log('additionalGasCharge:', additionalGasCharge)

		// const stubData = concat([
		// 	'0x00', // Reserved for future use
		// 	USDC_ADDRESS, // USDC address
		// 	zeroPadLeft(toBeHex(MAX_GAS_USDC)), // The max amount allowed to be paid per user op
		// 	DUMMY_ECDSA_SIGNATURE, // EIP-2612 permit signature
		// ])

		// paymasterData = 0x00 || usdc address || Max spendable gas in USDC || EIP-2612 permit signature
		const permitData = await getPermitData({
			client: this.options.client,
			tokenAddress: USDC_ADDRESS,
			chainId: this.options.chainId,
			ownerAddress: userOp.sender,
			spenderAddress: this.options.address,
			amount: MAX_GAS_USDC,
		})

		console.log('MAX_GAS_USDC', MAX_GAS_USDC)

		const signature = await signer.signTypedData(...permitData)
		const paymasterData = concat(['0x00', USDC_ADDRESS, zeroPadLeft(toBeHex(MAX_GAS_USDC)), signature])

		return {
			paymaster: this.options.address,
			paymasterData,
			paymasterPostOpGasLimit: additionalGasCharge,
			isFinal: true,
		}
	}

	async getPaymasterData(userOp: UserOp): Promise<GetPaymasterDataResult> {
		// paymasterData = 0x00 || usdc address || Max spendable gas in USDC || EIP-2612 permit signature
		const permitData = await getPermitData({
			client: this.options.client,
			tokenAddress: USDC_ADDRESS,
			chainId: this.options.chainId,
			ownerAddress: userOp.sender,
			spenderAddress: this.options.address,
			amount: MAX_GAS_USDC,
		})

		const signature = await signer.signTypedData(...permitData)
		const paymasterData = concat(['0x00', USDC_ADDRESS, zeroPadLeft(toBeHex(MAX_GAS_USDC)), signature])

		return {
			paymaster: this.options.address,
			paymasterData,
		}
	}
}

const usdcPaymaster = new CircleUSDCPaymaster({ client, chainId, address: PAYMASTESR_ADDRESS })

const kernel = new KernelV3Account({
	client,
	bundler,
	validator: new EOAValidatorModule({
		address: ADDRESS.ECDSAValidator,
		signer,
	}),
})

const isDeployed = (await client.getCode(computedAddress)) !== '0x'

if (!isDeployed) {
	const op = await kernel.deploy(creationOptions, new PublicPaymaster(ADDRESS.PublicPaymaster))
	const receipt = await op.wait()
	console.log('receipt.success', receipt.success)
}

const op2 = await kernel.connect(computedAddress).send(
	[
		{
			to: ADDRESS.Counter,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [123]),
			value: 0n,
		},
	],
	usdcPaymaster,
)
const receipt2 = await op2.wait()
console.log('receipt2.success', receipt2.success)

export async function getPermitData({
	client,
	tokenAddress,
	chainId,
	ownerAddress,
	spenderAddress,
	amount,
}: {
	client: JsonRpcProvider
	tokenAddress: string
	chainId: bigint
	ownerAddress: string
	spenderAddress: string
	amount: bigint
}): Promise<[TypedDataDomain, Record<string, Array<TypedDataField>>, Record<string, any>]> {
	const token = new Contract(
		tokenAddress,
		new Interface([
			'function name() view returns (string)',
			'function version() view returns (string)',
			'function nonces(address owner) view returns (uint256)',
		]),
		client,
	)

	const domain: TypedDataDomain = {
		name: await token.getFunction('name')(),
		version: await token.getFunction('version')(),
		chainId: chainId,
		verifyingContract: tokenAddress,
	}

	const types = {
		Permit: [
			{ name: 'owner', type: 'address' },
			{ name: 'spender', type: 'address' },
			{ name: 'value', type: 'uint256' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' },
		],
	}

	const value = {
		owner: ownerAddress,
		spender: spenderAddress,
		value: amount,
		nonce: await token.getFunction('nonces')(ownerAddress),
		deadline: MaxUint256,
	}

	return [domain, types, value]
}
