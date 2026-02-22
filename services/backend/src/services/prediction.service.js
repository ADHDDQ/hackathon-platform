/**
 * Prediction service — calls python-api, logs results to Postgres.
 */

import { query } from '../db/index.js';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

/**
 * Send a client feature payload to the Python ML service and return
 * the raw prediction result.
 */
export async function callPythonPredict(clientData) {
	const response = await fetch(`${PYTHON_API_URL}/predict`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(clientData),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		const err = new Error(`Python API error: ${response.status} ${body}`);
		err.status = 502;
		err.expose = true;
		throw err;
	}

	return response.json();
}

/**
 * Full predict flow: call ML, log to DB, return enriched result.
 *
 * @param {object} clientData   — feature object sent by the frontend
 * @param {string|null} clientId — optional client UUID to link the prediction
 * @returns prediction record with frontend-compatible shape
 */
export async function predict(clientData, clientId = null) {
	const mlResult = await callPythonPredict(clientData);

	// mlResult shape: { prediction: [{bundle_id, probability}], model_version, timestamp }
	const topBundle = mlResult.prediction?.[0]?.bundle_id ?? -1;
	const confidence = mlResult.prediction?.[0]?.probability ?? 0;
	const modelVersion = mlResult.model_version ?? 'unknown';

	// Log to database
	const { rows } = await query(
		`INSERT INTO predictions
		   (client_id, probabilities, top_bundle, confidence, model_version, feature_snapshot)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING *`,
		[
			clientId,
			JSON.stringify(mlResult.prediction),
			topBundle,
			confidence,
			modelVersion,
			JSON.stringify(clientData),
		],
	);

	// Return the frontend-compatible envelope alongside the DB record
	return {
		...mlResult,
		prediction_id: rows[0].id,
	};
}

/**
 * Fetch recent predictions, optionally filtered by client_id.
 */
export async function getPredictions({ limit = 50, clientId = null } = {}) {
	const conditions = [];
	const params = [];

	if (clientId) {
		params.push(clientId);
		conditions.push(`client_id = $${params.length}`);
	}

	params.push(Math.min(limit, 500));
	const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

	const { rows } = await query(
		`SELECT id, client_id, top_bundle, confidence, model_version, overridden, created_at
		 FROM predictions
		 ${where}
		 ORDER BY created_at DESC
		 LIMIT $${params.length}`,
		params,
	);

	return rows;
}

/**
 * Get a single prediction by id.
 */
export async function getPredictionById(id) {
	const { rows } = await query(`SELECT * FROM predictions WHERE id = $1`, [id]);
	return rows[0] ?? null;
}

/**
 * Mark a prediction as overridden.
 */
export async function markOverridden(predictionId) {
	await query(`UPDATE predictions SET overridden = TRUE WHERE id = $1`, [
		predictionId,
	]);
}
