export enum NexusValidationMode {
	VALIDATION = '0x00',
	MODULE_ENABLE = '0x01',
}

export type NexusCreationOptions = SingleValidatorCreation

export type SingleValidatorCreation = {
	bootstrap: 'initNexusWithSingleValidator'
	salt: string
	validatorAddress: string
	validatorInitData: string
	registryAddress: string
	attesters: string[]
	threshold: number
}
