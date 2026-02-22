/**
 * Express application factory.
 *
 * Configures middleware, mounts all route modules, and attaches the
 * central error handler.  Does NOT listen — that's server.js's job.
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Routes
import healthRoutes from './routes/health.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import predictionsRoutes from './routes/predictions.routes.js';
import overridesRoutes from './routes/overrides.routes.js';
import chatRoutes from './routes/chat.routes.js';
import automationsRoutes from './routes/automations.routes.js';

// RAG (existing SSE-based module — kept for backward compat)
import { createRagEventBus, registerRagRoutes } from './rag.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
	const app = express();

	// ── Global middleware ────────────────────────────────────
	app.use(cors());
	app.use(express.json());
	app.use(morgan('combined'));

	// ── Routes ──────────────────────────────────────────────
	app.use(healthRoutes); // GET /health
	app.use('/api/clients', clientsRoutes); // /api/clients/*
	app.use('/api', predictionsRoutes); // /api/predict, /api/predictions
	app.use('/api/overrides', overridesRoutes);
	app.use('/api/chat', chatRoutes);
	app.use('/api/automations', automationsRoutes);

	// RAG / SSE event stream (backward compatible)
	const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
	const ragEventBus = createRagEventBus();
	registerRagRoutes(app, { n8nUrl: N8N_URL, eventBus: ragEventBus });

	// ── Central error handler (must be last) ────────────────
	app.use(errorHandler);

	return app;
}
