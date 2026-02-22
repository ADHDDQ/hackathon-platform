/**
 * Centralized API client for the Assurance Agent app.
 * In dev mode the Vite proxy forwards /api → localhost:4000.
 * In Docker the static build uses VITE_BACKEND_URL (baked at build time).
 * Falls back to mock data when backend services are unreachable.
 */

import { MOCK_PREDICTION, MOCK_PREDICTIONS_HISTORY } from './mockData';

// Base URL: empty in dev (Vite proxy handles it), full URL in Docker build
const BASE = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');

// ── helpers ──────────────────────────────────────────────────

async function request(url, options = {}) {
	const res = await fetch(`${BASE}${url}`, {
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
	try {
		return await request('/api/predict', {
			method: 'POST',
			body: JSON.stringify(clientData),
		});
	} catch {
		// Backend unavailable — return mock prediction for demo
		console.warn('[demo] Using mock prediction data');
		return { ...MOCK_PREDICTION, timestamp: new Date().toISOString() };
	}
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
			} catch {
				// RAG also unavailable — fall through to mock
			}
		}
	}
	// All backends unavailable — return mock response for demo
	console.warn('[demo] Using mock chat response');
	const { getMockChatReply } = await import('./mockData');
	return getMockChatReply(message);
}

// ── Predictions log ──────────────────────────────────────────
export async function fetchPredictions(limit = 200) {
	try {
		const data = await request(`/api/predictions?limit=${limit}`);
		if (data && Array.isArray(data) && data.length > 0) return data;
		// Empty server response — fall through to mock
	} catch {
		// Backend unavailable — fall through to mock
	}
	// Return mock data for demo
	console.warn('[demo] Using mock predictions history');
	return MOCK_PREDICTIONS_HISTORY.slice(0, limit);
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
