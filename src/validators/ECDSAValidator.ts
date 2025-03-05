import { ERC7579Validator, type UserOp } from '@/core'
import type { BytesLike } from 'ethers'
import { Contract, EventLog, JsonRpcProvider, type Signer } from 'ethers'

type ConstructorOptions = {
	address: string
	client: JsonRpcProvider
	signer: Signer
}

export class ECDSAValidator extends ERC7579Validator {
	readonly #address: string
	readonly #client: JsonRpcProvider
	readonly #signer: Signer

	#ecdsaValidator: Contract

	constructor(options: ConstructorOptions) {
		super()
		this.#address = options.address
		this.#client = options.client
		this.#signer = options.signer

		this.#ecdsaValidator = new Contract(
			this.#address,
			['event OwnerRegistered(address indexed kernel, address indexed owner)'],
			this.#client,
		)
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

	async requestAccounts(): Promise<string[]> {
		const events = (await this.#ecdsaValidator.queryFilter(
			this.#ecdsaValidator.filters.OwnerRegistered(null, await this.#signer.getAddress()),
		)) as EventLog[]

		return events.map(event => event.args[0])
	}
}
