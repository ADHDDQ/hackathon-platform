/**
 * Database module — Postgres connection pool + schema bootstrap.
 *
 * Reads DATABASE_URL from env. Exports the pool and an initDb() that
 * creates all required tables idempotently.
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Run a single query against the pool (convenience wrapper).
 */
export function query(text, params) {
	return pool.query(text, params);
}

/**
 * Acquire a dedicated client from the pool (for transactions).
 */
export function getClient() {
	return pool.connect();
}

/**
 * Bootstrap: create all application tables if they don't exist.
 */
export async function initDb() {
	const client = await pool.connect();
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
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

export default pool;
