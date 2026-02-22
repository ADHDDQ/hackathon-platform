/**
 * Automations controller — trigger n8n workflows.
 */

import * as automationService from '../services/automation.service.js';

export async function triggerHighValueLead(req, res, next) {
	try {
		const { client, prediction } = req.body;

		if (!client || !prediction) {
			return res
				.status(400)
				.json({ success: false, error: 'client and prediction are required' });
		}

		const result = await automationService.triggerHighValueLead({
			client,
			prediction,
		});
		res.json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}
