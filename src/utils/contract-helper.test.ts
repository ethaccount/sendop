import { describe, expect, it } from 'vitest'
import { parseContractError } from './contract-helper'

describe('Contract Helper', () => {
	it('parseContractError', async () => {
		const revertData = '0x05a74e61'
		const result = parseContractError(revertData)
		expect(result).toBe(
			'Registry.NoTrustedAttestersFound' +
				' (Note: The prefix "Registry" may not correspond to the actual contract that triggered the revert.)',
		)

		const revertData2 = '0xa7eae1120000000000000000000000000000002d6db27c52e3c11c1cf24072004ac75cba'
		const result2 = parseContractError(revertData2)
		expect(result2).toBe(
			'SmartSession.InvalidISessionValidator(0x0000002D6DB27c52E3C11c1Cf24072004AC75cBa)' +
				' (Note: The prefix "SmartSession" may not correspond to the actual contract that triggered the revert.)',
		)
	})
})
