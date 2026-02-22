/**
 * Centralized API client.
 * All calls use relative paths so the Vite dev-server proxy works
 * and the Docker build (served behind a reverse proxy) also works.
 *
 * When "mock mode" is enabled in localStorage every call returns
 * deterministic mock data so the UI can be demonstrated without a backend.
 */

// ── helpers ──────────────────────────────────────────────────
function isMockMode() {
	try {
		return localStorage.getItem('mockMode') === 'true';
	} catch {
		return false;
	}
}

function delay(ms = 300) {
	return new Promise((r) => setTimeout(r, ms));
}

async function request(url, options = {}) {
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', ...options.headers },
		...options,
	});
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`${res.status} ${res.statusText}: ${body}`);
	}
	return res.json();
}

// ── mock data factories ──────────────────────────────────────

function mockPrediction(input = {}) {
	const bundles = Array.from({ length: 10 }, (_, i) => ({
		bundle_id: i,
		probability: +(Math.random() * 0.3).toFixed(4),
	}));
	bundles[2].probability = +(0.55 + Math.random() * 0.2).toFixed(4);
	bundles[5].probability = +(0.3 + Math.random() * 0.15).toFixed(4);
	bundles[7].probability = +(0.2 + Math.random() * 0.15).toFixed(4);
	bundles.sort((a, b) => b.probability - a.probability);
	return {
		prediction: bundles,
		model_version: 'v0-mock',
		timestamp: new Date().toISOString(),
		input,
	};
}

function mockLeads() {
	try {
		return JSON.parse(localStorage.getItem('leads') || '[]');
	} catch {
		return [];
	}
}

function mockPredictions() {
	try {
		return JSON.parse(localStorage.getItem('predictions') || '[]');
	} catch {
		return [];
	}
}

function mockDashboard() {
	const leads = mockLeads();
	const preds = mockPredictions();
	return {
		totalLeads: leads.length || 42,
		predictionsToday:
			preds.filter((p) => {
				const d = new Date(p.timestamp);
				const now = new Date();
				return d.toDateString() === now.toDateString();
			}).length || 17,
		averageConfidence: 0.62,
		overridesCount: leads.filter((l) => l.override).length || 3,
	};
}

function mockBundleDistribution() {
	return Array.from({ length: 10 }, (_, i) => ({
		bundle_id: i,
		count: Math.floor(Math.random() * 50) + 5,
	}));
}

function mockConfidenceDistribution() {
	return [
		{ range: '0.0-0.2', count: 4 },
		{ range: '0.2-0.4', count: 12 },
		{ range: '0.4-0.6', count: 28 },
		{ range: '0.6-0.8', count: 35 },
		{ range: '0.8-1.0', count: 18 },
	];
}

function mockRecentActivity() {
	return Array.from({ length: 10 }, (_, i) => ({
		id: `pred-${Date.now() - i * 60000}`,
		timestamp: new Date(Date.now() - i * 60000 * (i + 1)).toISOString(),
		topBundle: i % 10,
		confidence: +(0.3 + Math.random() * 0.6).toFixed(3),
		modelVersion: 'v0-mock',
	}));
}

// ── public API functions ─────────────────────────────────────

// Health
export async function fetchHealth() {
	if (isMockMode()) {
		await delay();
		return { status: 'ok', uptime: 99999, mock: true };
	}
	return request('/health');
}

// Dashboard
export async function fetchDashboardStats() {
	if (isMockMode()) {
		await delay();
		return mockDashboard();
	}
	try {
		return await request('/api/dashboard/stats');
	} catch {
		return mockDashboard();
	}
}

export async function fetchBundleDistribution() {
	if (isMockMode()) {
		await delay();
		return mockBundleDistribution();
	}
	try {
		return await request('/api/dashboard/bundle-distribution');
	} catch {
		return mockBundleDistribution();
	}
}

export async function fetchConfidenceDistribution() {
	if (isMockMode()) {
		await delay();
		return mockConfidenceDistribution();
	}
	try {
		return await request('/api/dashboard/confidence-distribution');
	} catch {
		return mockConfidenceDistribution();
	}
}

export async function fetchRecentActivity() {
	if (isMockMode()) {
		await delay();
		return mockRecentActivity();
	}
	try {
		return await request('/api/predictions?limit=10');
	} catch {
		return mockRecentActivity();
	}
}

// Predict
export async function postPredict(customerData) {
	if (isMockMode()) {
		await delay(500);
		return mockPrediction(customerData);
	}
	try {
		return await request('/api/predict', {
			method: 'POST',
			body: JSON.stringify(customerData),
		});
	} catch {
		// endpoint may not exist yet – return mock
		return mockPrediction(customerData);
	}
}

// Leads
export async function fetchLeads() {
	if (isMockMode()) {
		await delay();
		return mockLeads();
	}
	try {
		return await request('/api/leads');
	} catch {
		return mockLeads();
	}
}

export async function saveLead(leadData) {
	if (isMockMode()) {
		await delay();
		const leads = mockLeads();
		const lead = {
			id: `lead-${Date.now()}`,
			createdAt: new Date().toISOString(),
			status: 'New',
			...leadData,
		};
		leads.unshift(lead);
		localStorage.setItem('leads', JSON.stringify(leads));
		return lead;
	}
	try {
		return await request('/api/leads', {
			method: 'POST',
			body: JSON.stringify(leadData),
		});
	} catch {
		// fallback to localStorage
		const leads = mockLeads();
		const lead = {
			id: `lead-${Date.now()}`,
			createdAt: new Date().toISOString(),
			status: 'New',
			...leadData,
		};
		leads.unshift(lead);
		localStorage.setItem('leads', JSON.stringify(leads));
		return lead;
	}
}

export async function updateLead(id, updates) {
	if (isMockMode()) {
		await delay();
		const leads = mockLeads();
		const idx = leads.findIndex((l) => l.id === id);
		if (idx >= 0) {
			leads[idx] = { ...leads[idx], ...updates };
			localStorage.setItem('leads', JSON.stringify(leads));
			return leads[idx];
		}
		throw new Error('Lead not found');
	}
	try {
		return await request(`/api/leads/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(updates),
		});
	} catch {
		const leads = mockLeads();
		const idx = leads.findIndex((l) => l.id === id);
		if (idx >= 0) {
			leads[idx] = { ...leads[idx], ...updates };
			localStorage.setItem('leads', JSON.stringify(leads));
			return leads[idx];
		}
		throw new Error('Lead not found');
	}
}

// Overrides
export async function postOverride(leadId, bundleId, reason) {
	const payload = { leadId, bundleId, reason };
	if (isMockMode()) {
		await delay();
		const leads = mockLeads();
		const idx = leads.findIndex((l) => l.id === leadId);
		if (idx >= 0) {
			leads[idx].override = { bundleId, reason, at: new Date().toISOString() };
			localStorage.setItem('leads', JSON.stringify(leads));
		}
		return { ok: true };
	}
	try {
		return await request('/api/overrides', {
			method: 'POST',
			body: JSON.stringify(payload),
		});
	} catch {
		const leads = mockLeads();
		const idx = leads.findIndex((l) => l.id === leadId);
		if (idx >= 0) {
			leads[idx].override = { bundleId, reason, at: new Date().toISOString() };
			localStorage.setItem('leads', JSON.stringify(leads));
		}
		return { ok: true };
	}
}

// Predictions log
export async function fetchPredictionsLog() {
	if (isMockMode()) {
		await delay();
		return mockPredictions();
	}
	try {
		return await request('/api/predictions');
	} catch {
		return mockPredictions();
	}
}

export function savePredictionToLog(pred) {
	try {
		const preds = JSON.parse(localStorage.getItem('predictions') || '[]');
		preds.unshift(pred);
		localStorage.setItem('predictions', JSON.stringify(preds.slice(0, 500)));
	} catch {
		/* ignore */
	}
}

// n8n
export async function triggerN8n() {
	if (isMockMode()) {
		await delay(800);
		return { success: true, message: 'Mock workflow triggered', mock: true };
	}
	return request('/api/trigger-n8n');
}

// Automations runs
export async function fetchAutomationRuns() {
	if (isMockMode()) {
		await delay();
		return [
			{
				id: 1,
				workflow: 'Lead Notification',
				status: 'success',
				ranAt: new Date(Date.now() - 3600000).toISOString(),
			},
			{
				id: 2,
				workflow: 'Daily Report',
				status: 'success',
				ranAt: new Date(Date.now() - 7200000).toISOString(),
			},
		];
	}
	try {
		return await request('/api/automations/runs');
	} catch {
		return [];
	}
}
