/**
 * Express Backend – entry point
 *
 * Responsibilities:
 *   1. Expose REST endpoints consumed by the React frontend and n8n workflows.
 *   2. Connect to the shared Postgres instance for data persistence.
 *   3. Demonstrate inter-service communication by calling the n8n webhook.
 *
 * Environment variables (injected via Docker Compose / .env):
 *   DATABASE_URL – Postgres connection string
 *   BACKEND_PORT – HTTP listen port (default 4000)
 *   N8N_URL – n8n base URL (default http://localhost:5678)
 *   PYTHON_API_URL – Python API base URL (default http://localhost:8000)
 */

import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;
const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

console.log(
	`[backend] DATABASE_URL → ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@')}`,
);

// ── Middleware ───────────────────────────────────────────────
app.use(cors()); // Allow cross-origin requests from the frontend
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('combined')); // HTTP request logging

// ── Postgres connection pool ────────────────────────────────
// The DATABASE_URL uses the Docker service name "postgres" as host, which
// resolves to the Postgres container's IP on the shared Docker network.
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

// ── Bootstrap: create a demo table if it doesn't exist ──────
async function initDb() {
	const client = await pool.connect();
	try {
		await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id   SERIAL PRIMARY KEY,
        text TEXT        NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

		// Seed a row so the demo query always returns data
		const { rowCount } = await client.query(
			`SELECT 1 FROM messages WHERE text = 'Hello from the backend!'`,
		);
		if (rowCount === 0) {
			await client.query(
				`INSERT INTO messages (text) VALUES ('Hello from the backend!')`,
			);
		}
		console.log('[db] messages table ready');
	} finally {
		client.release();
	}
}

// ── Routes ──────────────────────────────────────────────────

/**
 * GET /health
 * Simple liveness probe used by Docker health-checks & monitoring.
 */
app.get('/health', (_req, res) => {
	res.json({
		status: 'ok',
		service: 'backend',
		timestamp: new Date().toISOString(),
	});
});

/**
 * GET /api/hello
 * Returns the latest message from Postgres.
 * This endpoint is called by the React frontend AND by the n8n workflow.
 */
app.get('/api/hello', async (_req, res) => {
	try {
		const { rows } = await pool.query(
			'SELECT id, text, created_at FROM messages ORDER BY id DESC LIMIT 1',
		);
		res.json({
			message: rows[0]?.text ?? 'No messages yet',
			source: 'express-backend',
			timestamp: new Date().toISOString(),
		});
	} catch (err) {
		console.error('[api/hello] DB error:', err.message);
		res.status(500).json({ error: 'Database query failed' });
	}
});

/**
 * POST /api/messages
 * Create a new message – demonstrates simple write path.
 */
app.post('/api/messages', async (req, res) => {
	const { text } = req.body;
	if (!text) return res.status(400).json({ error: 'text is required' });

	try {
		const { rows } = await pool.query(
			'INSERT INTO messages (text) VALUES ($1) RETURNING *',
			[text],
		);
		res.status(201).json(rows[0]);
	} catch (err) {
		console.error('[api/messages] DB error:', err.message);
		res.status(500).json({ error: 'Insert failed' });
	}
});

/**
 * GET /api/trigger-n8n
 * Demonstrates the backend calling n8n's webhook endpoint.
 * Inside Docker the n8n service is reachable at http://n8n:5678.
 */
app.get('/api/trigger-n8n', async (_req, res) => {
	try {
		const response = await fetch(`${N8N_URL}/webhook/hello`, {
			method: 'GET',
		});
		const data = await response.json();
		res.json({ n8n_response: data });
	} catch (err) {
		console.error('[api/trigger-n8n] n8n call failed:', err.message);
		res
			.status(502)
			.json({ error: 'Could not reach n8n', details: err.message });
	}
});

/**
 * GET /api/compute
 * Proxy call to the Python FastAPI service – shows cross-service communication.
 */
app.get('/api/compute', async (_req, res) => {
	try {
		const response = await fetch(`${PYTHON_API_URL}/compute`);
		const data = await response.json();
		res.json({ python_response: data });
	} catch (err) {
		console.error('[api/compute] python-api call failed:', err.message);
		res
			.status(502)
			.json({ error: 'Could not reach python-api', details: err.message });
	}
});

// ── Start server ────────────────────────────────────────────
initDb()
	.then(() => {
		app.listen(PORT, '0.0.0.0', () => {
			console.log(`[backend] listening on port ${PORT}`);
		});
	})
	.catch((err) => {
		console.error('[backend] failed to initialize DB:', err);
		process.exit(1);
	});
