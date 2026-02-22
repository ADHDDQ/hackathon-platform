/**
 * Override service — stores manual bundle overrides for ML feedback.
 */

import { query } from '../db/index.js';
import { markOverridden } from './prediction.service.js';

/**
 * Record an override and mark the parent prediction as overridden.
 */
export async function createOverride({ predictionId, selectedBundle, reason }) {
	// Mark the prediction
	await markOverridden(predictionId);

	// Insert override record
	const { rows } = await query(
		`INSERT INTO overrides (prediction_id, selected_bundle, reason)
		 VALUES ($1, $2, $3)
		 RETURNING *`,
		[predictionId, selectedBundle, reason ?? null],
	);

	return rows[0];
}

/**
 * List overrides for a given prediction (or all).
 */
export async function getOverrides({ predictionId = null, limit = 50 } = {}) {
	const conditions = [];
	const params = [];

	if (predictionId) {
		params.push(predictionId);
		conditions.push(`prediction_id = $${params.length}`);
	}

	params.push(Math.min(limit, 500));
	const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

	const { rows } = await query(
		`SELECT * FROM overrides ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
		params,
	);

	return rows;
}
