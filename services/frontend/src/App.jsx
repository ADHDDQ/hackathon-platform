import { useState, useEffect } from 'react';
import './App.css';

/**
 * VITE_BACKEND_URL is injected at build time by Vite.
 * During Docker builds it defaults to http://localhost:4000 so the
 * browser (running outside Docker) can reach the backend on the host.
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function App() {
	const [hello, setHello] = useState(null);
	const [health, setHealth] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		async function fetchData() {
			try {
				const [helloRes, healthRes] = await Promise.all([
					fetch(`${BACKEND_URL}/api/hello`),
					fetch(`${BACKEND_URL}/health`),
				]);
				setHello(await helloRes.json());
				setHealth(await healthRes.json());
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}
		fetchData();
	}, []);

	return (
		<div className="container">
			<header>
				<h1>🚀 Hackathon Platform</h1>
				<p className="subtitle">Full-stack monorepo with Docker Compose</p>
			</header>

			<main>
				{/* ── Backend Health ───────────────────────────────── */}
				<section className="card">
					<h2>Backend Health</h2>
					{loading && <p className="muted">Loading…</p>}
					{error && <p className="error">Error: {error}</p>}
					{health && <pre>{JSON.stringify(health, null, 2)}</pre>}
				</section>

				{/* ── /api/hello response ─────────────────────────── */}
				<section className="card">
					<h2>API Hello</h2>
					{loading && <p className="muted">Loading…</p>}
					{error && <p className="error">Error: {error}</p>}
					{hello && <pre>{JSON.stringify(hello, null, 2)}</pre>}
				</section>

				{/* ── Service map ─────────────────────────────────── */}
				<section className="card">
					<h2>Service Map</h2>
					<ul className="services">
						<li>
							<strong>Frontend</strong> – <code>localhost:3000</code>
						</li>
						<li>
							<strong>Backend</strong> – <code>localhost:4000</code>
						</li>
						<li>
							<strong>Python API</strong> – <code>localhost:8000</code>
						</li>
						<li>
							<strong>n8n</strong> – <code>localhost:5678</code>
						</li>
						<li>
							<strong>Postgres</strong> – <code>localhost:5432</code>
						</li>
					</ul>
				</section>
			</main>

			<footer>
				<p>Built for hackathons — powered by Docker Compose</p>
			</footer>
		</div>
	);
}

export default App;
