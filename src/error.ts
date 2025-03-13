import { version } from '../package.json'

export const PACKAGE_VERSION = version

export class SendopError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'SendopError'
		// Add sendop@version to the error message if it's not already there
		if (!this.message.includes('sendop@')) {
			this.message = `${this.message} (sendop@${PACKAGE_VERSION})`
		}
	}
}

export function normalizeError(unknownError: unknown): Error {
	let err = new Error(String(unknownError))

	if (unknownError instanceof Error) {
		err = unknownError
	}

	return err
}
