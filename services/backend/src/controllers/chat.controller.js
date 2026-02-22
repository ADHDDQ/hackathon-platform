/**
 * Chat controller — proxies AI chat messages.
 */

import * as chatService from '../services/chat.service.js';

export async function send(req, res, next) {
	try {
		const { message, clientContext } = req.body;

		if (!message || typeof message !== 'string' || !message.trim()) {
			return res
				.status(400)
				.json({ success: false, error: 'message is required' });
		}

		const result = await chatService.chat(message.trim(), clientContext);
		res.json({ success: true, data: result, ...result });
	} catch (err) {
		next(err);
	}
}
