import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { type Execution, type PaymasterGetter, type SendOpResult, type SignatureData, type UserOp } from '@/core'
import { SendopError, UnsupportedEntryPointError } from '@/error'
import { INTERFACES } from '@/interfaces'
import { connectEntryPointV08 } from '@/utils'
import type { Signer } from 'ethers'
import { SmartAccount, type SmartAccountOptions } from './SmartAccount'

export type Simple7702AccountOptions = SmartAccountOptions & {
	signer: Signer
}

export class Simple7702Account extends SmartAccount<any> {
	public readonly signer: Signer

	static override accountId() {
		return 'infinitism.Simple7702Account.0.8.0'
	}

	constructor(options: Simple7702AccountOptions) {
		super(options)
		this.signer = options.signer
	}

	override connect(address: string): Simple7702Account {
		return new Simple7702Account({
			...this._options,
			signer: this.signer,
			address,
		})
	}

	override deploy(creationOptions: any, pmGetter?: PaymasterGetter): Promise<SendOpResult> {
		throw new Simple7702AccountError('Not supported')
	}

	override getInitCode(): string {
		throw new Simple7702AccountError('Not supported')
	}

	override getNonceKey(): bigint {
		return 0n
	}

	override async getNonce(): Promise<bigint> {
		return await connectEntryPointV08(this.client).getNonce(await this.getSender(), this.getNonceKey())
	}

	getCallData(executions: Execution[]) {
		if (!executions.length) {
			return '0x'
		}

		if (executions.length === 1) {
			const execution = executions[0]
			return INTERFACES.Simple7702AccountV08.encodeFunctionData('execute', [
				execution.to,
				execution.value,
				execution.data,
			])
		}

		if (executions.length > 1) {
			return INTERFACES.Simple7702AccountV08.encodeFunctionData('executeBatch', [
				executions.map(execution => ({
					target: execution.to,
					value: execution.value,
					data: execution.data,
				})),
			])
		}

		throw new Simple7702AccountError('Simple7702Account.getCallData failed')
	}

	async getDummySignature(userOp: UserOp) {
		return DUMMY_ECDSA_SIGNATURE
	}

	async getSignature(signatureData: SignatureData) {
		switch (signatureData.entryPointVersion) {
			case 'v0.8':
				return await this.signer.signTypedData(signatureData.domain, signatureData.types, signatureData.values)
			default:
				throw new Simple7702AccountError(
					'Simple7702Account.getSignature failed',
					new UnsupportedEntryPointError(signatureData.entryPointVersion),
				)
		}
	}

	protected createError(message: string, cause?: Error): Error {
		return new Simple7702AccountError(message, cause)
	}
}

export class Simple7702AccountError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'Simple7702AccountError'
	}
}
