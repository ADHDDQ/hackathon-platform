/**
 * Central error-handling middleware.
 *
 * Catches any error thrown (or passed via next(err)) and returns a
 * consistent JSON envelope:  { success: false, error: <message> }
 */

export function errorHandler(err, _req, res, _next) {
	const status = err.status || err.statusCode || 500;
	const message = err.expose
		? err.message
		: err.message || 'Internal server error';

	if (status >= 500) {
		console.error(`[error] ${err.stack || err.message}`);
	}

	res.status(status).json({
		success: false,
		error: message,
	});
}
