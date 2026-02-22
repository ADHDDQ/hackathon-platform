/**
 * Health controller.
 */

export function healthCheck(_req, res) {
	res.json({ success: true, data: { status: 'ok' } });
}
