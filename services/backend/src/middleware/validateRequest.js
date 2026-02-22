/**
 * Lightweight request-body validator middleware factory.
 *
 * Usage:
 *   app.post('/api/foo', validateBody(['name', 'email']), handler);
 *
 * Returns 400 with { success: false, error } when required fields are missing.
 */

export function validateBody(requiredFields = []) {
	return (req, res, next) => {
		if (!req.body || typeof req.body !== 'object') {
			return res
				.status(400)
				.json({ success: false, error: 'Request body is required' });
		}

		const missing = requiredFields.filter(
			(f) => req.body[f] === undefined || req.body[f] === null,
		);
		if (missing.length > 0) {
			return res
				.status(400)
				.json({
					success: false,
					error: `Missing required fields: ${missing.join(', ')}`,
				});
		}

		next();
	};
}
