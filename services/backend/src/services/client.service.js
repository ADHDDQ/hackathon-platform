/**
 * Client service — CRUD operations for the clients table.
 */

import { query } from '../db/index.js';

/**
 * Create a new client and return the full row.
 */
export async function createClient(featureSnapshot) {
	const { rows } = await query(
		`INSERT INTO clients (feature_snapshot) VALUES ($1) RETURNING *`,
		[JSON.stringify(featureSnapshot)],
	);
	return rows[0];
}

/**
 * Get a client by UUID. Returns null if not found.
 */
export async function getClientById(id) {
	const { rows } = await query(`SELECT * FROM clients WHERE id = $1`, [id]);
	return rows[0] ?? null;
}

/**
 * Update the feature snapshot of an existing client.
 */
export async function updateClient(id, featureSnapshot) {
	const { rows } = await query(
		`UPDATE clients
		 SET feature_snapshot = $2, updated_at = NOW()
		 WHERE id = $1
		 RETURNING *`,
		[id, JSON.stringify(featureSnapshot)],
	);
	return rows[0] ?? null;
}

/**
 * Get a client with their most recent prediction attached.
 */
export async function getClientWithLatestPrediction(id) {
	const client = await getClientById(id);
	if (!client) return null;

	const { rows } = await query(
		`SELECT * FROM predictions
		 WHERE client_id = $1
		 ORDER BY created_at DESC
		 LIMIT 1`,
		[id],
	);

	return {
		...client,
		latest_prediction: rows[0] ?? null,
	};
}
