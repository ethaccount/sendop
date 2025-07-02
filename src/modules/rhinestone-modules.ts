import { ERC7579_MODULE_TYPE } from '@/erc7579'
import { getOwnableValidator } from '@rhinestone/module-sdk'
import type { Address } from 'viem'
import type { Module } from './types'

export class RhinestoneModules {
	static getOwnableValidator({ threshold, owners }: { threshold: number; owners: string[] }): Module {
		return {
			...getOwnableValidator({
				threshold,
				owners: owners.map(owner => owner as Address),
			}),
			type: ERC7579_MODULE_TYPE.VALIDATOR,
		}
	}
}
