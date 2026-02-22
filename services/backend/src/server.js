/**
 * Server bootstrap — loads env, initializes DB, starts HTTP.
 *
 * This is the entrypoint that Dockerfile CMD and npm scripts invoke.
 */

import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

import { initDb } from './db/index.js';
import { createApp } from './app.js';

const PORT = process.env.BACKEND_PORT || 4000;

async function main() {
	try {
		await initDb();
		console.info('[db] schema ready');
	} catch (err) {
		console.warn('[db] initialization failed (non-fatal):', err.message);
		console.warn('[db] backend will run without database');
	}

	const app = createApp();

	app.listen(PORT, '0.0.0.0', () => {
		console.info(`[backend] listening on port ${PORT}`);
	});
}

main();
