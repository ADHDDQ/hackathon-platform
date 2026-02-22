/**
 * Chat service — proxies chat messages and logs conversations.
 */

import { query } from '../db/index.js';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';
const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';

/**
 * Log a chat message to the database.
 * Silently skips when Postgres is unavailable.
 */
async function logMessage(role, message, clientId = null) {
	try {
		await query(
			`INSERT INTO chat_messages (client_id, message, role) VALUES ($1, $2, $3)`,
			[clientId, message, role],
		);
	} catch {
		// DB unavailable — skip logging
	}
}

/**
 * Try the n8n RAG endpoint first, then fall back to python-api /chat if available.
 */
async function callChatBackend(message, clientContext) {
	// Attempt 1: n8n RAG query
	try {
		const res = await fetch(`${N8N_URL}/webhook/rag-query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: message, clientContext }),
		});
		if (res.ok) {
			const data = await res.json();
			return {
				reply: data.context ?? data.reply ?? JSON.stringify(data),
				sources: data.sources ?? [],
			};
		}
	} catch {
		// fall through
	}

	// Attempt 2: python-api /chat (if it exists)
	try {
		const res = await fetch(`${PYTHON_API_URL}/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message, clientContext }),
		});
		if (res.ok) {
			return res.json();
		}
	} catch {
		// fall through
	}

	return {
		reply:
			'Sorry, the AI assistant is currently unavailable. Please try again later.',
		sources: [],
	};
}

/**
 * Main chat handler: log user message, get reply, log reply, return response.
 */
export async function chat(message, clientContext = null) {
	const clientId = clientContext?.User_ID || null;

	await logMessage('user', message, clientId);

	const result = await callChatBackend(message, clientContext);

	await logMessage('assistant', result.reply, clientId);

	return result;
}
