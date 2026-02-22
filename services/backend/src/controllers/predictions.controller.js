/**
 * Predictions controller — predict + list predictions.
 *
 * IMPORTANT: the frontend sends the raw client feature object directly
 * to POST /api/predict (not wrapped in { clientData }).  It expects:
 *   { prediction: [{ bundle_id, probability }], model_version, timestamp }
 *
 * We maintain that contract while also persisting results.
 */

import * as predictionService from '../services/prediction.service.js';

/**
 * POST /api/predict
 * Body: { ...clientFeatures }   (raw feature object from the frontend)
 */
export async function predict(req, res, next) {
	try {
		const clientData = req.body;

		if (!clientData || Object.keys(clientData).length === 0) {
			return res
				.status(400)
				.json({ success: false, error: 'Client feature data is required' });
		}

		// clientId is optional — frontend may or may not send User_ID
		const clientId = clientData.client_id ?? null;

		const result = await predictionService.predict(clientData, clientId);

		// Return the shape the frontend expects (prediction array + metadata)
		res.json(result);
	} catch (err) {
		next(err);
	}
}

/**
 * GET /api/predictions?limit=50&client_id=...
 */
export async function list(req, res, next) {
	try {
		const limit = parseInt(req.query.limit, 10) || 50;
		const clientId = req.query.client_id || null;
		const rows = await predictionService.getPredictions({ limit, clientId });
		res.json({ success: true, data: rows });
	} catch (err) {
		next(err);
	}
}
