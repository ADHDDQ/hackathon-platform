/**
 * activate-workflows.mjs
 *
 * Runs AFTER n8n starts inside the same container.
 * Uses the built-in Node.js fetch API (Node 18+) to:
 *   1. Wait for n8n to become ready
 *   2. Complete the owner setup (first-time only)
 *   3. Log in and get a session cookie
 *   4. List all workflows and activate them
 *
 * This removes the need to manually open the n8n UI to set up
 * an owner or toggle workflows active.
 */

const N8N_URL = 'http://localhost:5678';
const OWNER_EMAIL = process.env.N8N_OWNER_EMAIL || 'admin@hackathon.local';
const OWNER_PASSWORD = process.env.N8N_OWNER_PASSWORD || 'Hackathon123!';
const OWNER_FIRST = 'Admin';
const OWNER_LAST = 'User';

// ── Helpers ─────────────────────────────────────────────────

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

async function waitForReady(maxRetries = 90) {
	for (let i = 0; i < maxRetries; i++) {
		try {
			const res = await fetch(`${N8N_URL}/healthz`);
			if (res.ok) {
				console.log(`[activate] n8n ready after ~${i * 2}s`);
				return;
			}
		} catch {
			// not ready yet
		}
		await sleep(2000);
	}
	console.error('[activate] n8n did not become ready — giving up');
	process.exit(0); // don't crash the container
}

// Extract set-cookie header value
function extractCookie(res) {
	const raw = res.headers.get('set-cookie') || '';
	// n8n sets "n8n-auth=<token>; Path=/; ..."
	const match = raw.match(/(n8n-auth=[^;]+)/);
	return match ? match[1] : '';
}

// ── Main ────────────────────────────────────────────────────

async function main() {
	console.log('[activate] Waiting for n8n to start...');
	await waitForReady();

	// Small grace period for n8n to fully initialize routes
	await sleep(3000);

	// ── Step 1: Complete owner setup (idempotent — fails safely if already done)
	console.log('[activate] Attempting owner setup...');
	try {
		const setupRes = await fetch(`${N8N_URL}/rest/owner/setup`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: OWNER_EMAIL,
				firstName: OWNER_FIRST,
				lastName: OWNER_LAST,
				password: OWNER_PASSWORD,
			}),
		});
		const setupBody = await setupRes.text();
		if (setupRes.ok) {
			console.log('[activate] Owner setup complete');
		} else {
			console.log(
				`[activate] Owner setup skipped (${setupRes.status}) — likely already done`,
			);
		}
	} catch (err) {
		console.log('[activate] Owner setup call failed:', err.message);
	}

	// ── Step 2: Log in to get session cookie
	console.log('[activate] Logging in...');
	let cookie = '';
	try {
		const loginRes = await fetch(`${N8N_URL}/rest/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: OWNER_EMAIL,
				password: OWNER_PASSWORD,
			}),
		});
		if (loginRes.ok) {
			cookie = extractCookie(loginRes);
			console.log('[activate] Login successful');
		} else {
			console.log(
				`[activate] Login failed (${loginRes.status}) — workflows may not activate`,
			);
			return;
		}
	} catch (err) {
		console.log('[activate] Login call failed:', err.message);
		return;
	}

	if (!cookie) {
		console.log(
			'[activate] No auth cookie received — cannot activate workflows',
		);
		return;
	}

	// ── Step 3: List all workflows
	let workflows = [];
	try {
		const listRes = await fetch(`${N8N_URL}/rest/workflows`, {
			headers: { Cookie: cookie },
		});
		if (listRes.ok) {
			const body = await listRes.json();
			workflows = body.data || body || [];
			console.log(`[activate] Found ${workflows.length} workflow(s)`);
		} else {
			console.log(`[activate] Failed to list workflows (${listRes.status})`);
			return;
		}
	} catch (err) {
		console.log('[activate] List workflows failed:', err.message);
		return;
	}

	// ── Step 4: Activate each inactive workflow
	for (const wf of workflows) {
		if (wf.active) {
			console.log(`[activate] "${wf.name}" already active — skipping`);
			continue;
		}
		try {
			const activateRes = await fetch(
				`${N8N_URL}/rest/workflows/${wf.id}/activate`,
				{
					method: 'PATCH',
					headers: { Cookie: cookie, 'Content-Type': 'application/json' },
				},
			);
			if (activateRes.ok) {
				console.log(`[activate] ✓ Activated "${wf.name}"`);
			} else {
				// Try alternative endpoint (older n8n versions)
				const altRes = await fetch(`${N8N_URL}/rest/workflows/${wf.id}`, {
					method: 'PATCH',
					headers: { Cookie: cookie, 'Content-Type': 'application/json' },
					body: JSON.stringify({ active: true }),
				});
				if (altRes.ok) {
					console.log(`[activate] ✓ Activated "${wf.name}" (alt endpoint)`);
				} else {
					console.log(
						`[activate] ✗ Could not activate "${wf.name}" (${activateRes.status})`,
					);
				}
			}
		} catch (err) {
			console.log(`[activate] Error activating "${wf.name}":`, err.message);
		}
	}

	console.log('[activate] Done — all workflows processed');
}

main().catch((err) => {
	console.error('[activate] Unexpected error:', err);
	process.exit(0); // don't crash the container
});
