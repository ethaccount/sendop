import { fetchGasPricePimlico } from '@/fetchGasPrice'
import { publicPaymaster } from '@/paymasters/public-paymaster'
import type { Signer } from 'ethers'
import type { UserOpBuilder } from 'ethers-erc4337'

export async function executeUserOp(op: UserOpBuilder, pimlicoUrl: string, signer: Signer) {
	op.setGasPrice(await fetchGasPricePimlico(pimlicoUrl)).setPaymaster(publicPaymaster)

	await op.estimateGas()
	await op.signUserOpHash(userOpHash => signer.signMessage(userOpHash))

	const hash = await op.send()
	console.log('sent', hash)

	const receipt = await op.wait()
	console.log('success', receipt.success)
}
