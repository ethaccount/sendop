import { K1Validator__factory, type K1Validator } from '@/contract-types'
import { ERC7579Validator, type UserOp } from '@/core'
import type { BytesLike } from 'ethers'
import { JsonRpcProvider, type Signer } from 'ethers'

type ConstructorOptions = {
	address: string
	client: JsonRpcProvider
	signer: Signer
}

export class K1ValidatorModule extends ERC7579Validator {
	readonly #address: string
	readonly #client: JsonRpcProvider
	readonly #signer: Signer

	k1Validator: K1Validator

	constructor(options: ConstructorOptions) {
		super()
		this.#address = options.address
		this.#client = options.client
		this.#signer = options.signer

		this.k1Validator = K1Validator__factory.connect(this.#address, this.#client)
	}

	static getInitData(address: string): BytesLike {
		return address
	}

	static getDeInitData(): BytesLike {
		return '0x'
	}

	address() {
		return this.#address
	}

	getDummySignature(userOp: UserOp) {
		return '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'
	}

	async getSignature(userOpHash: Uint8Array, userOp: UserOp) {
		return await this.#signer.signMessage(userOpHash)
	}
}
