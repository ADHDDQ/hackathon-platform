/**
 * Overrides controller — record manual bundle overrides.
 */

import * as overrideService from '../services/override.service.js';

export async function create(req, res, next) {
	try {
		const { predictionId, selectedBundle, reason } = req.body;
		const override = await overrideService.createOverride({
			predictionId,
			selectedBundle,
			reason,
		});
		res.status(201).json({ success: true, data: override });
	} catch (err) {
		next(err);
	}
}

export async function list(req, res, next) {
	try {
		const predictionId = req.query.prediction_id || null;
		const limit = parseInt(req.query.limit, 10) || 50;
		const rows = await overrideService.getOverrides({ predictionId, limit });
		res.json({ success: true, data: rows });
	} catch (err) {
		next(err);
	}
}
