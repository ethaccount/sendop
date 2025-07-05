import type { BigNumberish, EthersError } from 'ethers'
import { getBytes, hexlify, isError, ZeroAddress } from 'ethers'
import { INITCODE_EIP7702_MARKER } from './constants'
import { packUserOp, toUserOpHex } from './conversion-utils'
import { type ERC4337Bundler } from './ERC4337Bundler'
import { EntryPointV08__factory } from './typechain'
import type {
	EIP7702Authorization,
	PackedUserOperation,
	UserOperation,
	UserOperationHex,
	UserOperationReceipt,
} from './UserOperation'
import {
	getEmptyUserOp,
	getUserOpHash,
	getUserOpHashWithEip7702,
	getV08DomainAndTypes,
	isEip7702UserOp,
	type TypedData,
} from './utils'

export class UserOpBuilder {
	private userOp: UserOperation
	private _chainId: number
	private _bundler?: ERC4337Bundler
	private _entryPointAddress?: string

	constructor({
		chainId,
		bundler,
		entryPointAddress,
	}: {
		chainId: BigNumberish
		bundler?: ERC4337Bundler
		entryPointAddress?: string
	}) {
		this.userOp = getEmptyUserOp()
		this._bundler = bundler
		this._chainId = Number(chainId)
		this._entryPointAddress = entryPointAddress
	}

	setEntryPoint(entryPointAddress: string): UserOpBuilder {
		this._entryPointAddress = entryPointAddress
		return this
	}

	setBundler(bundler: ERC4337Bundler): UserOpBuilder {
		this._bundler = bundler
		return this
	}

	get entryPointAddress(): string | undefined {
		return this._entryPointAddress
	}

	get bundler(): ERC4337Bundler | undefined {
		return this._bundler
	}

	get chainId(): number {
		return this._chainId
	}

	private checkEntryPointAddress(): void {
		if (!this._entryPointAddress) {
			throw new Error('[UserOpBuilder] entry point address is not set')
		}
	}

	private checkBundler(): void {
		if (!this._bundler) {
			throw new Error('[UserOpBuilder] bundler is not set')
		}
	}

	private checkSender(): void {
		if (!this.userOp.sender || this.userOp.sender === ZeroAddress) {
			throw new Error('[UserOpBuilder] sender is not set')
		}
	}

	setSender(sender: string): UserOpBuilder {
		this.userOp.sender = sender
		return this
	}

	setFactory({ factory, factoryData = '0x' }: { factory: string; factoryData?: string }): UserOpBuilder {
		this.userOp.factory = factory
		this.userOp.factoryData = factoryData
		return this
	}

	setEIP7702Auth(auth: EIP7702Authorization): UserOpBuilder {
		this.userOp.factory = INITCODE_EIP7702_MARKER
		this.userOp.eip7702Auth = auth
		return this
	}

	setNonce(nonce: BigNumberish): UserOpBuilder {
		this.userOp.nonce = nonce
		return this
	}

	setPaymaster({
		paymaster,
		paymasterData = '0x',
		paymasterPostOpGasLimit = 0,
	}: {
		paymaster: string
		paymasterData?: string
		paymasterPostOpGasLimit?: BigNumberish
	}): UserOpBuilder {
		this.userOp.paymaster = paymaster
		this.userOp.paymasterData = paymasterData
		this.userOp.paymasterPostOpGasLimit = paymasterPostOpGasLimit
		return this
	}

	setCallData(callData: string): UserOpBuilder {
		this.userOp.callData = callData
		return this
	}

	setGasPrice(feeData: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }): UserOpBuilder {
		this.userOp.maxFeePerGas = feeData.maxFeePerGas
		this.userOp.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
		return this
	}

	setGasValue(gasValues: {
		verificationGasLimit?: BigNumberish
		preVerificationGas?: BigNumberish
		callGasLimit?: BigNumberish
		paymasterVerificationGasLimit?: BigNumberish
		paymasterPostOpGasLimit?: BigNumberish
	}): UserOpBuilder {
		// Filter out undefined values
		const definedGasValues = Object.fromEntries(
			Object.entries(gasValues).filter(([, value]) => value !== undefined),
		)
		Object.assign(this.userOp, definedGasValues)
		return this
	}

	setSignature(signature: string): UserOpBuilder {
		this.userOp.signature = signature
		return this
	}

	preview(): UserOperation {
		return { ...this.userOp }
	}

	pack(): PackedUserOperation {
		return packUserOp(this.userOp)
	}

	hex(): UserOperationHex {
		return toUserOpHex(this.userOp)
	}

	hash(): string {
		this.checkEntryPointAddress()
		if (isEip7702UserOp(this.userOp)) {
			if (!this.userOp.eip7702Auth) {
				throw new Error('[UserOpBuilder#hash] EIP-7702 auth is not set')
			}
			return hexlify(getUserOpHashWithEip7702(this.userOp, this._chainId, this.userOp.eip7702Auth.address))
		}
		return hexlify(getUserOpHash(this.userOp, this._entryPointAddress!, this._chainId))
	}

	typedData(): TypedData {
		const { domain, types } = getV08DomainAndTypes(this._chainId)
		return [domain, types, this.pack()]
	}

	async estimateGas(): Promise<void> {
		this.checkSender()
		this.checkEntryPointAddress()
		this.checkBundler()

		try {
			const estimations = await this._bundler!.estimateUserOperationGas(this.userOp, this._entryPointAddress!)
			this.userOp.verificationGasLimit = estimations.verificationGasLimit
			this.userOp.preVerificationGas = estimations.preVerificationGas
			this.userOp.callGasLimit = estimations.callGasLimit
			this.userOp.paymasterVerificationGasLimit = estimations.paymasterVerificationGasLimit
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				throw new Error(`[UserOpBuilder#estimateGas] ${e.error?.message}`)
			} else {
				throw new Error(`[UserOpBuilder#estimateGas] ${e}`)
			}
		}
	}

	async signUserOpHash(fn: (userOpHash: Uint8Array) => Promise<string>): Promise<void> {
		const signature = await fn(getBytes(this.hash()))
		this.userOp.signature = signature
	}

	async signUserOpTypedData(fn: (typedData: TypedData) => Promise<string>): Promise<void> {
		const signature = await fn(this.typedData())
		this.userOp.signature = signature
	}

	async send(): Promise<string> {
		this.checkSender()
		this.checkEntryPointAddress()
		this.checkBundler()

		try {
			return await this._bundler!.sendUserOperation(this.userOp, this._entryPointAddress!)
		} catch (e: unknown) {
			if (isError(e, (e as EthersError).code)) {
				throw new Error(`[UserOpBuilder#send] ${e.error?.message}`)
			} else {
				throw new Error(`[UserOpBuilder#send] ${e}`)
			}
		}
	}

	async wait(): Promise<UserOperationReceipt> {
		this.checkBundler()
		return await this._bundler!.waitForReceipt(this.hash())
	}

	async execute(): Promise<{
		hash: string
		receipt: UserOperationReceipt
	}> {
		const hash = await this.send()
		const receipt = await this.wait()
		return {
			hash,
			receipt,
		}
	}

	encodeHandleOpsData(
		{
			beneficiary = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
			gasOverride,
		}: {
			beneficiary?: string
			gasOverride?: {
				preVerificationGas?: BigNumberish
				verificationGasLimit?: BigNumberish
				callGasLimit?: BigNumberish
				paymasterVerificationGasLimit?: BigNumberish
				paymasterPostOpGasLimit?: BigNumberish
			}
		} = { beneficiary: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', gasOverride: undefined },
	): string {
		if (gasOverride) {
			const newUserOp = { ...this.userOp, ...gasOverride }
			return EntryPointV08__factory.createInterface().encodeFunctionData('handleOps', [
				[packUserOp(newUserOp)],
				beneficiary,
			])
		}
		return EntryPointV08__factory.createInterface().encodeFunctionData('handleOps', [[this.pack()], beneficiary])
	}

	/**
	 * Add default gas values to the user operation and then encode the handleOps data
	 * - preVerificationGas: 99_999
	 * - verificationGasLimit: 999_999
	 * - callGasLimit: 999_999
	 * - paymasterVerificationGasLimit: 999_999 if paymaster is set, otherwise undefined
	 * - paymasterPostOpGasLimit: 999_999 if paymaster is set, otherwise undefined
	 */
	encodeHandleOpsDataWithDefaultGas(
		{
			beneficiary = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
			gasOverride,
		}: {
			beneficiary?: string
			gasOverride?: {
				preVerificationGas?: BigNumberish
				verificationGasLimit?: BigNumberish
				callGasLimit?: BigNumberish
				paymasterVerificationGasLimit?: BigNumberish
				paymasterPostOpGasLimit?: BigNumberish
			}
		} = { beneficiary: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', gasOverride: undefined },
	): string {
		const defaultGasLimit = {
			preVerificationGas: 99_999,
			verificationGasLimit: 999_999,
			callGasLimit: 999_999,
			paymasterVerificationGasLimit: this.userOp.paymaster ? 999_999 : undefined,
			paymasterPostOpGasLimit: this.userOp.paymaster ? 999_999 : undefined,
		}
		const newUserOp = { ...this.userOp, ...defaultGasLimit, ...gasOverride }
		return EntryPointV08__factory.createInterface().encodeFunctionData('handleOps', [
			[packUserOp(newUserOp)],
			beneficiary,
		])
	}
}
