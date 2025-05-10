import { ADDRESS } from '@/addresses'
import { TScheduledTransfers__factory } from '@/contract-types'
import { PimlicoBundler, PublicPaymaster } from '@/index'
import { JsonRpcProvider } from 'ethers'
import { setup } from 'test/utils'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { executeScheduledTransfer } from './executeScheduledTransfer'

const argv = await yargs(hideBin(process.argv))
	.option('network', {
		alias: 'n',
		choices: ['local', 'sepolia'] as const,
		description: 'Network (local or sepolia)',
		demandOption: true,
	})
	// address
	.option('address', {
		alias: 'a',
		type: 'string',
		description: 'Address',
		demandOption: true,
	})
	.help().argv

const CHAIN_IDS = {
	local: 1337n,
	sepolia: 11155111n,
} as const
const chainId = CHAIN_IDS[argv.network]
const { logger, CLIENT_URL, BUNDLER_URL, account1 } = await setup({ chainId })
logger.info(`Chain ID: ${chainId}`)

const client = new JsonRpcProvider(CLIENT_URL, undefined, {
	batchMaxCount: 1,
})
const bundler = new PimlicoBundler(chainId, BUNDLER_URL, {
	parseError: true,
})

const pmGetter = new PublicPaymaster(ADDRESS.PublicPaymaster)

const scheduledTransfers = TScheduledTransfers__factory.connect(ADDRESS.ScheduledTransfers, client)

const permissionId = '0xba06d407c8d9ddaaac3b680421283c1c424cd21e8205173dfef1840705aa9957'
let done = false

async function main() {
	const ticker = setInterval(async () => {
		if (done) {
			clearInterval(ticker)
			return
		}
		console.log('tick')
	}, 1000)

	const executions = await scheduledTransfers.queryFilter(scheduledTransfers.filters.ExecutionAdded(argv.address))
	if (!executions.length) {
		console.log('no executions found')
		return
	}

	for (const execution of executions) {
		const jobId = execution.args.jobId
		const executionConfig = await fetchExecutionConfig(argv.address, jobId)
		const now = Math.floor(Date.now() / 1000)

		if (!executionConfig.isEnabled) {
			console.log(`job ${jobId} is disabled, skipping`)
			continue
		}

		if (executionConfig.startDate > now) {
			console.log(`job ${jobId} is not yet enabled, skipping`)
			continue
		}

		if (executionConfig.startDate < now) {
			await scheduleNextExecution(argv.address, permissionId, jobId)
		}
	}
}

main().catch(console.error)

async function actualExecution(account: string, permissionId: string, jobId: bigint) {
	if (chainId === 1337n) {
		await setBlockTimestampToNow()
	}

	console.log(`start executing job ${jobId} for account ${account}`)
	try {
		const receipt = await executeScheduledTransfer({
			accountAddress: account,
			permissionId,
			jobId,
			client,
			bundler,
			pmGetter,
			sessionSigner: account1,
		})

		if (!receipt.success) {
			throw new Error('Execution failed')
		}
	} catch (error: unknown) {
		console.error(error)
	}
}

async function setBlockTimestampToNow() {
	const now = Math.floor(Date.now() / 1000)

	await client.send('evm_setNextBlockTimestamp', [now] as [number])
	await client.send('evm_mine', [])

	const block = await client.getBlock('latest')
	if (block) {
		console.log('New block timestamp:', block.timestamp)
	}
}

async function fetchExecutionConfig(account: string, jobId: bigint) {
	const executionLog = await scheduledTransfers.executionLog(account, jobId)
	return executionLog
}

const scheduleNextExecution = async (account: string, permissionId: string, jobId: bigint) => {
	const {
		isEnabled,
		executeInterval,
		startDate,
		lastExecutionTime,
		numberOfExecutions,
		numberOfExecutionsCompleted,
	} = await fetchExecutionConfig(account, jobId)

	// If job is completed or disabled, don't schedule next execution
	if (!isEnabled || numberOfExecutionsCompleted >= numberOfExecutions) {
		console.log("job is completed or disabled, don't schedule next execution")
		done = true
		return
	}

	const block = await client.getBlock('latest')
	if (!block) throw new Error('Failed to get latest block')
	const now = BigInt(block.timestamp)

	let nextExecutionTime: bigint
	// If never executed before, use startDate
	if (lastExecutionTime === 0n) {
		nextExecutionTime = BigInt(startDate)
	} else {
		nextExecutionTime = lastExecutionTime + executeInterval
	}

	console.log('sheduling, nextExecutionTime', nextExecutionTime)

	// If next execution time is in the past, execute immediately
	if (nextExecutionTime <= now) {
		console.log('Execute immediately')
		await executeJob(account, permissionId, jobId)
		return
	}

	// Schedule next execution
	const delay = Number(nextExecutionTime - now)
	console.log(`Schedule next execution, delay ${delay} seconds`)

	setTimeout(async () => {
		await scheduleNextExecution(account, permissionId, jobId)
	}, delay * 1000)
}

const executeJob = async (account: string, permissionId: string, jobId: bigint) => {
	await actualExecution(account, permissionId, jobId)
	console.log('One job finished')

	const config = await fetchExecutionConfig(account, jobId)
	if (config.numberOfExecutionsCompleted === config.numberOfExecutions) {
		console.log('scheduled transfer finished')
		done = true
		return
	}
	await scheduleNextExecution(account, permissionId, jobId)
}
