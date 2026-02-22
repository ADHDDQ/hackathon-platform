/**
 * Client controller — handles HTTP for client CRUD.
 */

import * as clientService from '../services/client.service.js';

export async function create(req, res, next) {
	try {
		const { clientData } = req.body;
		const client = await clientService.createClient(clientData || req.body);
		res.status(201).json({ success: true, data: client });
	} catch (err) {
		next(err);
	}
}

export async function getById(req, res, next) {
	try {
		const result = await clientService.getClientWithLatestPrediction(
			req.params.id,
		);
		if (!result) {
			return res
				.status(404)
				.json({ success: false, error: 'Client not found' });
		}
		res.json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}

export async function update(req, res, next) {
	try {
		const { clientData } = req.body;
		const client = await clientService.updateClient(
			req.params.id,
			clientData || req.body,
		);
		if (!client) {
			return res
				.status(404)
				.json({ success: false, error: 'Client not found' });
		}
		res.json({ success: true, data: client });
	} catch (err) {
		next(err);
	}
}
