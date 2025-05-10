import { SendopError } from '@/error'
import { zeroPadLeft } from './ethers-helper'

export function findPrevious(array: string[], entry: string): string {
	for (let i = 0; i < array.length; i++) {
		if (array[i].toLowerCase() === entry.toLowerCase()) {
			if (i === 0) {
				return zeroPadLeft('0x01', 20)
			} else {
				return array[i - 1]
			}
		}
	}
	throw new SendopError('sentinel-list-helper: findPrevious: Entry not found in array')
}
