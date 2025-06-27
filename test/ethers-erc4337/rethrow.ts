// rethrow "cleaned up" exception.
// - stack trace goes back to method (or catch) line, not inner provider
// - attempt to parse revert data (needed for geth)
// use with ".catch(rethrow())", so that current source file/line is meaningful.
export function rethrow(): (e: Error) => void {
	const callerStack = new Error().stack!.replace(/Error.*\n.*at.*\n/, '').replace(/.*at.* \(internal[\s\S]*/, '')

	if (arguments[0] != null) {
		throw new Error('must use .catch(rethrow()), and NOT .catch(rethrow)')
	}
	return function (e: Error) {
		const solstack = e.stack!.match(/((?:.* at .*\.sol.*\n)+)/)
		const stack = (solstack != null ? solstack[1] : '') + callerStack
		// const regex = new RegExp('error=.*"data":"(.*?)"').compile()
		const found = /error=.*?"data":"(.*?)"/.exec(e.message)
		let message: string
		if (found != null) {
			const data = found[1]
			message = e.message + ' - ' + data.slice(0, 100)
		} else {
			message = e.message
		}
		const err = new Error(message)
		err.stack = 'Error: ' + message + '\n' + stack
		throw err
	}
}
