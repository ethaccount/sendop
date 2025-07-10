import { fetchGasPricePimlico } from '@/fetchGasPrice'
import type { AccountAPI, Execution, PaymasterAPI, SignerBehavior } from '@/types'
import { getBytes, JsonRpcProvider } from 'ethers'
import { ERC4337Bundler, UserOpBuilder, type UserOperationReceipt } from '@/core'
import { pimlico, type PimlicoChain } from 'evm-providers'

const { PIMLICO_API_KEY = '' } = process.env

if (!PIMLICO_API_KEY) {
	throw new Error('PIMLICO_API_KEY is not set')
}

export async function executeUserOperation({
	accountAPI,
	accountAddress,
	chainId,
	client,
	bundler,
	executions,
	signer,
	paymasterAPI,
	deployment,
}: {
	accountAPI: AccountAPI
	accountAddress: string
	chainId: number
	client: JsonRpcProvider
	bundler: ERC4337Bundler
	signer: SignerBehavior
	paymasterAPI: PaymasterAPI
	executions: Execution[]
	deployment?: {
		factory: string
		factoryData: string
	}
}): Promise<UserOperationReceipt> {
	const op = await buildAccountExecutions({
		accountAPI,
		accountAddress,
		chainId,
		client,
		bundler,
		executions,
	})

	if (deployment) {
		op.setFactory(deployment)
	}

	op.setPaymaster({
		paymaster: await paymasterAPI.getPaymaster(),
		paymasterData: await paymasterAPI.getPaymasterData(),
		paymasterPostOpGasLimit: await paymasterAPI.getPaymasterPostOpGasLimit(),
	})

	op.setGasPrice(await fetchGasPricePimlico(pimlico(chainId as PimlicoChain, PIMLICO_API_KEY)))

	await op.estimateGas()

	const sig = await signer.signHash(getBytes(op.hash()))
	op.setSignature(await accountAPI.formatSignature(sig)) // format signature by AccountAPI

	console.log(op.hex())

	const hash = await op.send()
	console.log('sent', hash)

	const receipt = await op.wait()
	console.log('success', receipt.success)

	return receipt
}

export async function buildAccountExecutions({
	accountAPI,
	accountAddress,
	chainId,
	client,
	bundler,
	executions,
}: {
	accountAPI: AccountAPI
	accountAddress: string
	chainId: number
	client: JsonRpcProvider
	bundler: ERC4337Bundler
	executions: Execution[]
}) {
	return new UserOpBuilder({ chainId, bundler, entryPointAddress: accountAPI.entryPointAddress })
		.setSender(accountAddress)
		.setCallData(await accountAPI.getCallData(executions))
		.setNonce(await accountAPI.getNonce(client, accountAddress))
		.setSignature(await accountAPI.getDummySignature())
}
