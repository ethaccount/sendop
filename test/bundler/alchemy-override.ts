import { ADDRESS } from '@/addresses'
import { EOAValidatorModule, KernelV3Account, RpcProvider, sendop } from '@/index'
import { Interface } from 'ethers'
import { MyPaymaster, logger, setupCLI } from '../utils'

const { signer, bundler, client } = await setupCLI(['r', 'p', 'b'], {
	bundlerOptions: {
		debug: true,
		async onAfterEstimation(gasValues) {
			const rpcProvider = new RpcProvider(bundler.url)

			const [block, maxPriorityFeePerGas] = await Promise.all([
				rpcProvider.send({ method: 'eth_getBlockByNumber', params: ['latest', true] }),
				rpcProvider.send({ method: 'rundler_maxPriorityFeePerGas' }),
			])

			const newMaxPriorityFeePerGas = (BigInt(maxPriorityFeePerGas) * 200n) / 100n

			return {
				...gasValues,
				maxPriorityFeePerGas: newMaxPriorityFeePerGas,
				maxFeePerGas: (BigInt(block.baseFeePerGas) * 200n) / 100n + newMaxPriorityFeePerGas,
			}
		},
	},
})

const accountAddress = '0x5f8D953E1C5EEfF31855E00897101c9FA7353bC9'

const number = Math.floor(Math.random() * 10000)

const op = await sendop({
	bundler,
	executions: [
		{
			to: ADDRESS.Counter,
			data: new Interface(['function setNumber(uint256)']).encodeFunctionData('setNumber', [number]),
			value: 0n,
		},
	],
	opGetter: new KernelV3Account({
		address: accountAddress,
		client,
		bundler,
		validator: new EOAValidatorModule({
			address: ADDRESS.ECDSAValidator,
			signer,
		}),
	}),
	pmGetter: new MyPaymaster({
		client,
		paymasterAddress: ADDRESS.CharityPaymaster,
	}),
})

logger.info(`hash: ${op.hash}`)

const receipt = await op.wait()
logger.info('receipt.success:', receipt.success)
