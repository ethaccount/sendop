import { ADDRESS } from '@/addresses'
import { DUMMY_ECDSA_SIGNATURE } from '@/constants'
import { type Execution, type SignatureData } from '@/core'
import type { UserOperation } from '@/ethers-erc4337'
import { SendopError, UnsupportedEntryPointError } from '@/error'
import { INTERFACES } from '@/interfaces'
import { connectEntryPointV08 } from '@/utils'
import { concat, Contract, type JsonRpcProvider, type Signer } from 'ethers'
import { SmartAccount, type SmartAccountOptions } from './SmartAccount'

export type SimpleAccountCreationOptions = {
	salt: string
	owner: string
}

export type SimpleAccountOptions = SmartAccountOptions & {
	signer: Signer
}

export class SimpleAccount extends SmartAccount<SimpleAccountCreationOptions> {
	public readonly signer: Signer

	static override accountId() {
		return 'infinitism.SimpleAccount.0.8.0'
	}

	constructor(options: SimpleAccountOptions) {
		super(options)
		this.signer = options.signer
	}

	override connect(address: string): SimpleAccount {
		return new SimpleAccount({
			...this._options,
			signer: this.signer,
			address,
		})
	}

	static override async computeAccountAddress(
		client: JsonRpcProvider,
		creationOptions: SimpleAccountCreationOptions,
	): Promise<string> {
		const factory = new Contract(ADDRESS.SimpleAccountFactoryV08, INTERFACES.SimpleAccountFactoryV08, client)
		return await factory.getFunction('getAddress(address,uint256)')(
			creationOptions.owner,
			BigInt(creationOptions.salt),
		)
	}

	static override getInitCode(creationOptions: SimpleAccountCreationOptions): string {
		return concat([
			ADDRESS.SimpleAccountFactoryV08,
			INTERFACES.SimpleAccountFactoryV08.encodeFunctionData('createAccount', [
				creationOptions.owner,
				BigInt(creationOptions.salt),
			]),
		])
	}

	override getInitCode(creationOptions: SimpleAccountCreationOptions): string {
		return SimpleAccount.getInitCode(creationOptions)
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
			return INTERFACES.SimpleAccountV08.encodeFunctionData('execute', [
				execution.to,
				execution.value,
				execution.data,
			])
		}

		if (executions.length > 1) {
			return INTERFACES.SimpleAccountV08.encodeFunctionData('executeBatch', [
				executions.map(execution => ({
					target: execution.to,
					value: execution.value,
					data: execution.data,
				})),
			])
		}

		throw new SimpleAccountError('SimpleAccount.getCallData failed')
	}

	async getDummySignature(userOp: UserOperation) {
		return DUMMY_ECDSA_SIGNATURE
	}

	async getSignature(signatureData: SignatureData) {
		switch (signatureData.entryPointVersion) {
			case 'v0.8':
				return await this.signer.signTypedData(signatureData.domain, signatureData.types, signatureData.values)
			default:
				throw new SimpleAccountError(
					'SimpleAccount.getSignature failed',
					new UnsupportedEntryPointError(signatureData.entryPointVersion),
				)
		}
	}

	protected createError(message: string, cause?: Error): Error {
		return new SimpleAccountError(message, cause)
	}
}

export class SimpleAccountError extends SendopError {
	constructor(message: string, cause?: Error) {
		super(message, cause)
		this.name = 'SimpleAccountError'
	}
}
