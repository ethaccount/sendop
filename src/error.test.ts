import { setup } from 'test/utils'
import { describe, expect, it } from 'vitest'
import { PACKAGE_VERSION, SendopError } from './error'
import { RpcProvider } from './RpcProvider'

const { BUNDLER_URL } = await setup()

describe('Error', () => {
	it('should contain sendop version in error message', async () => {
		const provider = new RpcProvider(BUNDLER_URL)
		let result
		try {
			await provider.send({
				method: 'invalid_method',
				params: [],
			})
		} catch (err: unknown) {
			if (err instanceof SendopError) {
				result = err.message
			} else {
				throw err
			}
		}
		expect(result).toContain(`(sendop@${PACKAGE_VERSION})`)
	})
})
