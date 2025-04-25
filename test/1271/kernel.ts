import { ADDRESS } from '@/addresses'
import { IERC1271__factory } from '@/contract-types'
import { INTERFACES } from '@/interfaces'
import { type TypedData } from '@/utils'
import { concat, TypedDataEncoder } from 'ethers'
import { keccak256 } from 'ethers/crypto'
import { setupCLI } from 'test/utils'

const { signer, client, chainId } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
		async onBeforeEstimation(userOp) {
			return userOp
		},
	},
})

const KERNEL_ADDRESS = '0xf3dE595397024CE7fce87538d8B21E8FedEa89de'

const dataHash = keccak256('0x1271')

const typedData: TypedData = [
	{
		name: 'Kernel',
		version: '0.3.1',
		chainId,
		verifyingContract: KERNEL_ADDRESS,
	},
	{
		KernelWrapper: [{ name: 'hash', type: 'bytes32' }],
	},
	{
		hash: dataHash,
	},
]

const typedDataHash = TypedDataEncoder.hash(...typedData)
console.log('typedDataHash', typedDataHash)

const signature = await signer.signTypedData(...typedData)
console.log('signature', signature)

const kernelSignature = concat([
	'0x01', // validation type validator
	ADDRESS.ECDSAValidator,
	signature,
])
console.log('kernelSignature', kernelSignature)

const isValid = await IERC1271__factory.connect(KERNEL_ADDRESS, client).isValidSignature(dataHash, kernelSignature)

const calldata = INTERFACES.IERC1271.encodeFunctionData('isValidSignature', [dataHash, kernelSignature])

console.log(isValid)
console.log(calldata)
