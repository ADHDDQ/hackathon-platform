/**
 * Centralized API client for the Assurance Agent app.
 * All calls use relative paths so the Vite dev-server proxy works
 * and the Docker build (behind a reverse proxy) also works.
 */

// ── helpers ──────────────────────────────────────────────────

async function request(url, options = {}) {
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', ...options.headers },
		...options,
	});
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		const err = new Error(
			`${res.status} ${res.statusText}${body ? ': ' + body : ''}`,
		);
		err.status = res.status;
		throw err;
	}
	return res.json();
}

// ── Health ───────────────────────────────────────────────────
export async function fetchHealth() {
	return request('/health');
}

// ── Clients ──────────────────────────────────────────────────
/**
 * Attempt to load a client profile.
 * Returns null when the endpoint doesn't exist (404).
 */
export async function fetchClient(clientId) {
	try {
		return await request(`/api/clients/${encodeURIComponent(clientId)}`);
	} catch (err) {
		if (err.status === 404) return null;
		throw err;
	}
}

// ── Predict ──────────────────────────────────────────────────
export async function postPredict(clientData) {
	return request('/api/predict', {
		method: 'POST',
		body: JSON.stringify(clientData),
	});
}

// ── Chat / RAG ───────────────────────────────────────────────
/**
 * Send a chat message. Tries /api/chat first, then /api/rag/query.
 * Returns { reply, sources } or null if no backend.
 */
export async function sendChat(message, clientContext = null) {
	try {
		return await request('/api/chat', {
			method: 'POST',
			body: JSON.stringify({ message, clientContext }),
		});
	} catch (err) {
		if (err.status === 404) {
			// fall back to the existing RAG endpoint
			try {
				const data = await request('/api/rag/query', {
					method: 'POST',
					body: JSON.stringify({ query: message }),
				});
				return {
					reply: data.context ?? data.reply ?? JSON.stringify(data),
					sources: data.sources ?? [],
				};
			} catch (ragErr) {
				if (ragErr.status === 404) return null;
				throw ragErr;
			}
		}
		throw err;
	}
}

// ── Predictions log ──────────────────────────────────────────
export async function fetchPredictions(limit = 200) {
	try {
		return await request(`/api/predictions?limit=${limit}`);
	} catch (err) {
		if (err.status === 404) return null;
		throw err;
	}
}

// ── Local prediction log (localStorage) ─────────────────────
export function savePredictionToLog(pred) {
	try {
		const preds = JSON.parse(localStorage.getItem('predictions') || '[]');
		preds.unshift(pred);
		localStorage.setItem('predictions', JSON.stringify(preds.slice(0, 500)));
	} catch {
		/* ignore */
	}
}

export function getLocalPredictions() {
	try {
		return JSON.parse(localStorage.getItem('predictions') || '[]');
	} catch {
		return [];
	}
}
