/**
 * setup-workflows.mjs — runs in the background after n8n starts.
 *
 * Waits for an owner account to exist (user signs up manually via the UI),
 * then activates all imported workflows so their webhooks go live.
 *
 * Does NOT create any account — that's left to the user on first visit
 * to http://localhost:5678.
 */

const BASE = 'http://localhost:5678';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Wait for n8n to be reachable ────────────────────────── */
async function waitReady() {
	for (let i = 0; i < 90; i++) {
		try {
			const r = await fetch(`${BASE}/healthz`);
			if (r.ok) return;
		} catch {}
		await sleep(2000);
	}
	throw new Error('n8n did not become ready within 3 minutes');
}

/* ── Wait until an owner account has been created (user signs up in UI) ── */
async function waitForOwner() {
	console.log('[setup] Waiting for owner signup via n8n UI...');
	for (let i = 0; i < 600; i++) {
		try {
			// /rest/settings is public and tells us if setup is complete
			const r = await fetch(`${BASE}/rest/settings`);
			if (r.ok) {
				const body = await r.json();
				// In n8n, once owner is set up, userManagement.showSetupOnFirstLoad becomes false
				const settings = body.data || body;
				if (
					settings.userManagement?.showSetupOnFirstLoad === false ||
					settings.onboardingCallPromptEnabled !== undefined ||
					settings.isDocker !== undefined
				) {
					// Try to see if there are any users
					// If settings endpoint says setup is done, we're good
					if (settings.userManagement?.showSetupOnFirstLoad === false) {
						console.log('[setup] Owner account detected!');
						return true;
					}
				}
			}
		} catch {}
		await sleep(3000);
	}
	console.log(
		'[setup] Timed out waiting for owner — workflows will not be auto-activated',
	);
	return false;
}

/* ── Activate all workflows via the internal API key ─────── */
async function activateWorkflows() {
	// Use n8n's internal endpoint to list workflows — try API key first, then cookie-less
	// Since we run inside the same container, we can use the internal API

	// First, let's try to just activate via the DB by re-importing with active flag
	// n8n CLI import actually respects --active flag in some versions
	const { execSync } = await import('node:child_process');
	const { readdir } = await import('node:fs/promises');

	const dir = '/import/workflows';
	let files;
	try {
		files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
	} catch {
		console.log('[setup] No workflow dir found');
		return;
	}

	for (const file of files) {
		console.log(`[setup] Re-importing ${file} to ensure active state...`);
		try {
			// Re-import overwrites the workflow and the active:true in the JSON
			// should be picked up after owner exists
			execSync(`n8n import:workflow --input="/import/workflows/${file}"`, {
				stdio: 'pipe',
				timeout: 30000,
			});
			console.log(`[setup] Re-imported ${file}`);
		} catch (e) {
			console.log(`[setup] Re-import failed for ${file}: ${e.message}`);
		}
	}

	// Now let's restart the workflow activation by toggling via the REST API
	// We need auth — let's poll the /rest/workflows endpoint as a logged-in user
	// Since we can't log in without credentials, we use the n8n CLI to update
	try {
		const result = execSync('n8n update:workflow --all --active=true', {
			stdio: 'pipe',
			timeout: 30000,
		});
		console.log(
			`[setup] Activated all workflows via CLI: ${result.toString().trim()}`,
		);
	} catch (e) {
		console.log(`[setup] CLI activation failed: ${e.message}`);
		console.log(
			'[setup] Workflows are imported but may need manual activation in the n8n UI',
		);
	}
}

async function main() {
	console.log('[setup] Waiting for n8n to be ready...');
	await waitReady();
	await sleep(3000);

	// Wait for the user to create their account
	const ownerExists = await waitForOwner();

	if (ownerExists) {
		await activateWorkflows();
	}

	console.log('[setup] ✓ Done');
}

main().catch((e) => {
	console.error('[setup] Fatal:', e.message);
	process.exit(0);
});
