/**
 * Database module — Postgres connection pool + schema bootstrap.
 *
 * Reads DATABASE_URL from env. Exports the pool and an initDb() that
 * creates all required tables idempotently.
 *
 * When Postgres is unavailable every query silently returns empty results
 * so the rest of the backend (chat, predictions, etc.) keeps working.
 */

import pg from 'pg';

const { Pool } = pg;

let pool = null;
let dbAvailable = false;

try {
	if (process.env.DATABASE_URL) {
		pool = new Pool({ connectionString: process.env.DATABASE_URL });
		// Swallow pool-level errors so they don't crash the process
		pool.on('error', (err) => {
			console.warn('[db] pool error (non-fatal):', err.message);
			dbAvailable = false;
		});
	}
} catch {
	pool = null;
}

/** Stub result returned when Postgres is unreachable. */
const EMPTY_RESULT = { rows: [], rowCount: 0 };

/**
 * Run a single query against the pool (convenience wrapper).
 * Returns an empty result set when the database is unavailable.
 */
export async function query(text, params) {
	if (!pool) return EMPTY_RESULT;
	try {
		const result = await pool.query(text, params);
		return result;
	} catch (err) {
		console.warn('[db] query failed (non-fatal):', err.message);
		return EMPTY_RESULT;
	}
}

/**
 * Acquire a dedicated client from the pool (for transactions).
 * Returns null when the database is unavailable.
 */
export async function getClient() {
	if (!pool) return null;
	try {
		return await pool.connect();
	} catch (err) {
		console.warn('[db] getClient failed (non-fatal):', err.message);
		return null;
	}
}

/**
 * Bootstrap: create all application tables if they don't exist.
 * Silently skips when Postgres is unavailable.
 */
export async function initDb() {
	const client = await getClient();
	if (!client) {
		console.warn('[db] Postgres unavailable — running without database');
		return;
	}
	try {
		await client.query('BEGIN');

		// ── Clients ─────────────────────────────────────────
		await client.query(`
			CREATE TABLE IF NOT EXISTS clients (
				id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				created_at      TIMESTAMPTZ      DEFAULT NOW(),
				updated_at      TIMESTAMPTZ      DEFAULT NOW(),
				feature_snapshot JSONB            NOT NULL DEFAULT '{}'::jsonb
			);
		`);

		// ── Predictions ─────────────────────────────────────
		await client.query(`
			CREATE TABLE IF NOT EXISTS predictions (
				id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
				probabilities JSONB        NOT NULL DEFAULT '[]'::jsonb,
				top_bundle    INT          NOT NULL,
				confidence    DOUBLE PRECISION NOT NULL,
				model_version TEXT         NOT NULL DEFAULT 'unknown',
				feature_snapshot JSONB     NOT NULL DEFAULT '{}'::jsonb,
				overridden    BOOLEAN      NOT NULL DEFAULT FALSE,
				created_at    TIMESTAMPTZ  DEFAULT NOW()
			);
		`);

		// ── Overrides ───────────────────────────────────────
		await client.query(`
			CREATE TABLE IF NOT EXISTS overrides (
				id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				prediction_id  UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
				selected_bundle INT  NOT NULL,
				reason         TEXT,
				created_at     TIMESTAMPTZ DEFAULT NOW()
			);
		`);

		// ── Chat messages ───────────────────────────────────
		await client.query(`
			CREATE TABLE IF NOT EXISTS chat_messages (
				id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				client_id  UUID REFERENCES clients(id) ON DELETE SET NULL,
				message    TEXT         NOT NULL,
				role       TEXT         NOT NULL CHECK (role IN ('user', 'assistant')),
				created_at TIMESTAMPTZ  DEFAULT NOW()
			);
		`);

		await client.query('COMMIT');
		dbAvailable = true;
	} catch (err) {
		await client.query('ROLLBACK').catch(() => {});
		console.warn('[db] initDb failed (non-fatal):', err.message);
	} finally {
		client.release();
	}
}

export { dbAvailable };
export default pool;
