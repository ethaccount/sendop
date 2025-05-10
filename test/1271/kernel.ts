import { ADDRESS } from '@/addresses'
import { TIERC1271__factory } from '@/contract-types'
import { INTERFACES } from '@/interfaces'
import { type TypedData } from '@/utils'
import { concat, getBytes, TypedDataEncoder } from 'ethers'
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

const KERNEL_ADDRESS = '0x9E80bcb1CCcE649659D8Ed69835F2d561866e382'

const dataHash = keccak256('0x1271')
console.log('dataHash', dataHash)

const typedData: TypedData = [
	{
		name: 'Kernel',
		version: '0.3.1',
		chainId,
		verifyingContract: KERNEL_ADDRESS,
	},
	{
		Kernel: [{ name: 'hash', type: 'bytes32' }],
	},
	{
		hash: dataHash,
	},
]

const typedDataHash = TypedDataEncoder.hash(...typedData)
const signature = await signer.signMessage(getBytes(typedDataHash))
console.log('signature', signature)

const kernelSignature = concat([
	'0x01', // validation type: validator
	ADDRESS.ECDSAValidator,
	signature,
])
console.log('kernelSignature', kernelSignature)

const isValid = await TIERC1271__factory.connect(KERNEL_ADDRESS, client).isValidSignature(dataHash, kernelSignature)

const calldata = INTERFACES.IERC1271.encodeFunctionData('isValidSignature', [dataHash, kernelSignature])

console.log(isValid)
console.log(calldata)
