import { normalizeError, SendopError } from './error'

export type RpcRequest = {
	readonly method: string
	readonly params?: readonly unknown[] | object
}

type BatchResponse = {
	status: 'fulfilled' | 'rejected'
	value?: unknown
	reason?: string
	id: number
	method: string
}

export type RpcProviderOptions = {
	debug?: boolean
}

export class RpcProvider {
	readonly url: string
	protected readonly _options: RpcProviderOptions

	constructor(url: string, options?: RpcProviderOptions) {
		this.url = url
		this._options = options ?? {}
	}

	async send(request: RpcRequest) {
		let response
		try {
			const payload = {
				method: 'post',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: request.method,
					id: 1,
					params: request.params,
				}),
			}
			if (this._options.debug) {
				console.log(this.url)
				console.log(
					JSON.stringify(
						{
							...payload,
							body: JSON.parse(payload.body),
						},
						null,
						2,
					),
				)
			}
			response = await fetch(this.url, payload)
		} catch (error: unknown) {
			const err = normalizeError(error)
			throw new SendopError(err.message, { cause: err })
		}

		const data = await response.json()

		if (data.error) {
			let errMsg = ''
			if (typeof data.error === 'string') {
				// etherspot might return a string error message in data.error
				errMsg = data.error
			} else {
				// Note that data.error.data is specific to Alchemy
				errMsg = data.error.code
					? `${request.method} (${data.error.code}): ${data.error.message}${
							data.error.data ? ` - ${JSON.stringify(data.error.data)}` : ''
					  }`
					: `${request.method}: ${data.error.message}${
							data.error.data ? ` - ${JSON.stringify(data.error.data)}` : ''
					  }`
			}
			throw new JsonRpcError(errMsg)
		}

		// etherspot might return a message in data.message
		if (data.message) {
			throw new JsonRpcError(data.message)
		}

		if (!response.ok) {
			const errorText = await response.text()
			throw new HttpError(`status: ${response.status}, message: ${errorText}`)
		}

		// data.result might be undefined
		return data.result
	}

	async sendBatch(requests: RpcRequest[]): Promise<BatchResponse[]> {
		let response
		try {
			response = await fetch(this.url, {
				method: 'post',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(
					requests.map((req, index) => ({
						jsonrpc: '2.0',
						method: req.method,
						id: index + 1,
						params: req.params,
					})),
				),
			})
		} catch (error: unknown) {
			const err = normalizeError(error)
			throw new SendopError(err.message, { cause: err })
		}

		if (!response.ok) {
			throw new HttpError(`status: ${response.status}`)
		}

		const results = await response.json()

		return results.map((result: any, index: number) => {
			if (result.error) {
				return {
					status: 'rejected' as const,
					reason: `${result.error.message}${result.error.code ? ` (${result.error.code})` : ''}`,
					id: result.id,
					method: requests[index].method,
				}
			}
			return {
				status: 'fulfilled' as const,
				value: result.result,
				id: result.id,
				method: requests[index].method,
			}
		})
	}
}

export class JsonRpcError extends SendopError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'JsonRpcError'
	}
}

export class HttpError extends SendopError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'HttpError'
	}
}
