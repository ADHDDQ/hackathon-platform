import { randomUUID } from 'node:crypto';

export function createRagEventBus({ maxEvents = 100 } = {}) {
	const clients = new Set();
	const events = [];

	function addEvent(event) {
		events.unshift(event);
		if (events.length > maxEvents) {
			events.length = maxEvents;
		}
		const payload = `event: update\ndata: ${JSON.stringify(event)}\n\n`;
		for (const res of clients) {
			res.write(payload);
		}
	}

	function getSnapshot() {
		return [...events].reverse();
	}

	function addClient(res) {
		clients.add(res);
	}

	function removeClient(res) {
		clients.delete(res);
	}

	return { addEvent, getSnapshot, addClient, removeClient };
}

export function registerRagRoutes(
	app,
	{ n8nUrl = process.env.N8N_URL || 'http://localhost:5678', eventBus, fetchImpl } = {},
) {
	const bus = eventBus ?? createRagEventBus();
	const fetcher = fetchImpl ?? fetch;

	app.post('/api/rag/query', async (req, res) => {
		const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
		if (!query) {
			return res.status(400).json({ error: 'query is required' });
		}

		try {
			const response = await fetcher(`${n8nUrl}/webhook/rag-query`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query }),
			});

			if (!response.ok) {
				const body = await response.text().catch(() => '');
				return res.status(502).json({
					error: 'n8n error',
					details: `${response.status} ${response.statusText}: ${body}`,
				});
			}

			const data = await response.json();
			const event = {
				id: randomUUID(),
				type: 'query',
				query,
				at: new Date().toISOString(),
			};
			bus.addEvent(event);
			return res.json(data);
		} catch (err) {
			return res.status(502).json({
				error: 'Could not reach n8n',
				details: err.message,
			});
		}
	});

	app.post('/api/rag/sync', (req, res) => {
		const eventType = typeof req.body?.event_type === 'string' ? req.body.event_type : '';
		const fileId = typeof req.body?.file_id === 'string' ? req.body.file_id : '';
		const fileName = typeof req.body?.file_name === 'string' ? req.body.file_name : '';
		const chunkIndex =
			typeof req.body?.chunk_index === 'number' ? req.body.chunk_index : null;

		if (!eventType || !fileId || !fileName) {
			return res.status(400).json({
				error: 'event_type, file_id, file_name are required',
			});
		}

		const event = {
			id: randomUUID(),
			type: 'ingest',
			event_type: eventType,
			file_id: fileId,
			file_name: fileName,
			chunk_index: chunkIndex,
			at: new Date().toISOString(),
		};
		bus.addEvent(event);
		return res.json({ ok: true });
	});

	app.get('/api/rag/events', (req, res) => {
		res.set({
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		});
		res.flushHeaders?.();

		const snapshot = bus.getSnapshot();
		res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
		bus.addClient(res);

		const keepAlive = setInterval(() => {
			res.write(':\n\n');
		}, 25000);

		req.on('close', () => {
			clearInterval(keepAlive);
			bus.removeClient(res);
		});
	});

	return bus;
}
