import { useState, useEffect, useCallback } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { fetchHealth, fetchPythonHealth } from '../lib/api';

export default function Settings() {
	const [mockMode, setMockMode] = useState(() => {
		try {
			return localStorage.getItem('mockMode') === 'true';
		} catch {
			return false;
		}
	});
	const [backendHealth, setBackendHealth] = useState(null);
	const [pythonHealth, setPythonHealth] = useState(null);
	const [checking, setChecking] = useState(false);

	const checkHealth = useCallback(async () => {
		setChecking(true);
		try {
			const [bh, ph] = await Promise.allSettled([
				fetchHealth(),
				fetchPythonHealth(),
			]);
			setBackendHealth(
				bh.status === 'fulfilled' ? bh.value : { error: bh.reason?.message },
			);
			setPythonHealth(
				ph.status === 'fulfilled' ? ph.value : { error: ph.reason?.message },
			);
		} finally {
			setChecking(false);
		}
	}, []);

	useEffect(() => {
		checkHealth();
	}, [checkHealth]);

	function toggleMock() {
		const next = !mockMode;
		setMockMode(next);
		localStorage.setItem('mockMode', String(next));
	}

	return (
		<div className="page">
			<h2 className="page-title">Settings</h2>

			{/* Mock Mode */}
			<Card title="Mock Mode">
				<div className="setting-row">
					<div>
						<p>
							When enabled, all API calls return mocked data. Useful for demo or
							offline use.
						</p>
					</div>
					<label className="toggle-switch">
						<input type="checkbox" checked={mockMode} onChange={toggleMock} />
						<span className="toggle-slider" />
					</label>
				</div>
				<Badge variant={mockMode ? 'warning' : 'success'}>
					{mockMode ? 'Mock Mode ON' : 'Live Mode'}
				</Badge>
			</Card>

			{/* Health checks */}
			<Card
				title="Service Health"
				actions={
					<button
						className="btn btn-sm btn-secondary"
						onClick={checkHealth}
						disabled={checking}
					>
						{checking ? 'Checking…' : '🔄 Refresh'}
					</button>
				}
			>
				<div className="health-grid">
					<div className="health-item">
						<h4>Backend (Express)</h4>
						{backendHealth ? (
							backendHealth.error ? (
								<Badge variant="danger">Unreachable</Badge>
							) : (
								<>
									<Badge variant="success">Healthy</Badge>
									<pre className="code-block mt-2">
										{JSON.stringify(backendHealth, null, 2)}
									</pre>
								</>
							)
						) : (
							<span className="muted">Checking…</span>
						)}
					</div>
					<div className="health-item">
						<h4>Python API (FastAPI)</h4>
						{pythonHealth ? (
							pythonHealth.error ? (
								<Badge variant="danger">Unreachable</Badge>
							) : (
								<>
									<Badge variant="success">Healthy</Badge>
									<pre className="code-block mt-2">
										{JSON.stringify(pythonHealth, null, 2)}
									</pre>
								</>
							)
						) : (
							<span className="muted">Checking…</span>
						)}
					</div>
				</div>
			</Card>

			{/* About */}
			<Card title="About">
				<p className="muted">
					Smart Insurance Recommender — an AI-powered insurance bundle
					recommendation platform. Built with React, Express, FastAPI, n8n, and
					PostgreSQL.
				</p>
			</Card>
		</div>
	);
}
