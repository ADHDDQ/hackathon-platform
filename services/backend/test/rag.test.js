import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRagEventBus, registerRagRoutes } from '../src/rag.js';

function createServer({ fetchImpl } = {}) {
	const app = express();
	app.use(express.json());
	const bus = createRagEventBus();
	registerRagRoutes(app, { n8nUrl: 'http://n8n.local', eventBus: bus, fetchImpl });
	const server = app.listen(0);
	const { port } = server.address();
	const baseUrl = `http://127.0.0.1:${port}`;
	return { server, baseUrl, bus };
}

test('rag query rejects missing payload', async () => {
	const { server, baseUrl } = createServer();
	try {
		const res = await fetch(`${baseUrl}/api/rag/query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});
		assert.equal(res.status, 400);
		const body = await res.json();
		assert.equal(body.error, 'query is required');
	} finally {
		server.close();
	}
});

test('rag query proxies to n8n and returns response', async () => {
	const fetchImpl = async (url, options) => {
		assert.equal(url, 'http://n8n.local/webhook/rag-query');
		assert.equal(options.method, 'POST');
		return {
			ok: true,
			json: async () => ({ context: 'ok', sources: ['doc'] }),
		};
	};
	const { server, baseUrl } = createServer({ fetchImpl });
	try {
		const res = await fetch(`${baseUrl}/api/rag/query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: 'test' }),
		});
		assert.equal(res.status, 200);
		const body = await res.json();
		assert.equal(body.context, 'ok');
		assert.deepEqual(body.sources, ['doc']);
	} finally {
		server.close();
	}
});

test('rag sync stores events', async () => {
	const { server, baseUrl, bus } = createServer();
	try {
		const res = await fetch(`${baseUrl}/api/rag/sync`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				event_type: 'fileCreated',
				file_id: 'abc',
				file_name: 'doc.pdf',
				chunk_index: 1,
			}),
		});
		assert.equal(res.status, 200);
		const body = await res.json();
		assert.equal(body.ok, true);
		const snapshot = bus.getSnapshot();
		assert.equal(snapshot.length, 1);
		assert.equal(snapshot[0].file_id, 'abc');
	} finally {
		server.close();
	}
});
