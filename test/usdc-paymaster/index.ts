import { ADDRESS } from '@/addresses'
import { IERC20__factory } from '@/contract-types'
import { PublicPaymaster } from '@/paymasters'
import { CircleUSDCPaymaster, type TypedData } from '@/paymasters/CircleUSDCPaymaster'
import { KernelV3Account } from '@/smart-accounts'
import { zeroPadLeft } from '@/utils'
import { EOAValidatorModule } from '@/validators'
import { concat, formatUnits, Interface, parseUnits, toBeHex } from 'ethers'
import { setupCLI } from 'test/utils'

/*

bun run test/usdc-paymaster/index.ts -r $arbitrumSepolia

*/

const PAYMASTESR_ADDRESS = '0x31BE08D380A21fc740883c0BC434FcFc88740b58'
const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
const PERMIT_AMOUNT = parseUnits('2', 6)

const { client, signer, bundler, chainId } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
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

const usdcPaymaster = new CircleUSDCPaymaster({
	client,
	chainId,
	paymasterAddress: PAYMASTESR_ADDRESS,
	tokenAddress: USDC_ADDRESS,
	permitAmount: PERMIT_AMOUNT,
	getSignature: async (permitHash: string) => {
		const typedData: TypedData = [
			{
				name: 'Kernel',
				version: '0.3.1',
				chainId: chainId,
				verifyingContract: computedAddress,
			},
			{
				KernelWrapper: [{ name: 'hash', type: 'bytes32' }],
			},
			{
				hash: permitHash,
			},
		]

		const signature = await signer.signTypedData(...typedData)

		const kernelSignature = concat([
			'0x01', // Validation mode or validator type?
			ADDRESS.ECDSAValidator,
			signature,
		])

		return kernelSignature
	},
})

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
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [
				Math.floor(Math.random() * 10000),
			]),
			value: 0n,
		},
	],
	usdcPaymaster,
)
const receipt2 = await op2.wait()
console.log('receipt2.success', receipt2.success)
