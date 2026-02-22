/**
 * Automation service — fires n8n webhooks for business events.
 */

const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';

/**
 * Trigger the high-value-lead webhook in n8n.
 *
 * @param {{ client: object, prediction: object }} payload
 */
export async function triggerHighValueLead(payload) {
	const response = await fetch(`${N8N_URL}/webhook/high-value-lead`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		const err = new Error(`n8n webhook error: ${response.status} ${body}`);
		err.status = 502;
		err.expose = true;
		throw err;
	}

	return response.json().catch(() => ({ ok: true }));
}
