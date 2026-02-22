import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import { triggerN8n, fetchAutomationRuns, ragQuery } from '../lib/api';

export default function Automations() {
	const [triggerLoading, setTriggerLoading] = useState(false);
	const [triggerResult, setTriggerResult] = useState(null);
	const [triggerError, setTriggerError] = useState(null);
	const [runs, setRuns] = useState([]);
	const [runsLoading, setRunsLoading] = useState(true);
	const [ragQuestion, setRagQuestion] = useState('');
	const [ragLoading, setRagLoading] = useState(false);
	const [ragResult, setRagResult] = useState(null);
	const [ragError, setRagError] = useState(null);
	const [ragEvents, setRagEvents] = useState([]);

	const isDev = import.meta.env.MODE === 'development';

	useEffect(() => {
		fetchAutomationRuns()
			.then((data) => setRuns(Array.isArray(data) ? data : []))
			.finally(() => setRunsLoading(false));
	}, []);

	useEffect(() => {
		let source;
		let active = true;
		try {
			const mockMode = localStorage.getItem('mockMode') === 'true';
			if (!mockMode && typeof EventSource !== 'undefined') {
				source = new EventSource('/api/rag/events');
				source.addEventListener('snapshot', (event) => {
					if (!active) return;
					const data = JSON.parse(event.data || '[]');
					setRagEvents(Array.isArray(data) ? data : []);
				});
				source.addEventListener('update', (event) => {
					if (!active) return;
					const data = JSON.parse(event.data || '{}');
					setRagEvents((prev) => [data, ...prev].slice(0, 20));
				});
			}
		} catch {
			setRagEvents([]);
		}
		return () => {
			active = false;
			if (source) source.close();
		};
	}, []);

	async function handleTrigger() {
		setTriggerLoading(true);
		setTriggerError(null);
		setTriggerResult(null);
		try {
			const res = await triggerN8n();
			setTriggerResult(res);
		} catch (err) {
			setTriggerError(err.message);
		} finally {
			setTriggerLoading(false);
		}
	}

	async function handleRagQuery() {
		const trimmed = ragQuestion.trim();
		if (!trimmed) {
			setRagError('Enter a question to search the knowledge base.');
			return;
		}
		setRagLoading(true);
		setRagError(null);
		setRagResult(null);
		try {
			const data = await ragQuery(trimmed);
			setRagResult(data);
		} catch (err) {
			setRagError(err.message);
		} finally {
			setRagLoading(false);
		}
	}

	return (
		<div className="page">
			<h2 className="page-title">Automations</h2>

			<Card title="About Automations">
				<p style={{ lineHeight: 1.7 }}>
					Automations are powered by <strong>n8n</strong>, a workflow automation
					tool. Workflows can be triggered via webhooks, on schedule, or based
					on events. Use automations to send notifications, sync leads with CRM,
					generate reports, and more.
				</p>
			</Card>

			<div className="grid-2">
				{/* Trigger */}
				<Card title="Test Workflow">
					<p className="muted mb-3">
						Triggers the n8n webhook → calls backend + python-api → returns
						combined response.
					</p>
					<button
						className="btn btn-primary"
						disabled={triggerLoading}
						onClick={handleTrigger}
					>
						{triggerLoading ? 'Running…' : '▶ Trigger n8n Workflow'}
					</button>
					{triggerError && <p className="error mt-2">Error: {triggerError}</p>}
					{triggerResult && (
						<pre className="code-block mt-2">
							{JSON.stringify(triggerResult, null, 2)}
						</pre>
					)}
				</Card>

				{/* n8n Editor */}
				<Card title="n8n Editor">
					{isDev ? (
						<>
							<p className="muted mb-3">
								Open the n8n visual editor to create and manage workflows.
							</p>
							<a
								href="http://localhost:5678"
								target="_blank"
								rel="noopener noreferrer"
								className="btn btn-secondary"
							>
								🔗 Open n8n Editor
							</a>
						</>
					) : (
						<>
							<p className="muted mb-3">
								In production/Docker mode the n8n editor is available at your
								server's port <strong>5678</strong>. Check your deployment
								configuration for the correct URL.
							</p>
							<a
								href="/n8n/"
								target="_blank"
								rel="noopener noreferrer"
								className="btn btn-secondary"
							>
								🔗 Try n8n Editor
							</a>
						</>
					)}
				</Card>
			</div>

			<div className="grid-2">
				<Card title="RAG Query">
					<div className="form-field">
						<span>Question</span>
						<textarea
							rows="4"
							placeholder="Ask about insurance policies, coverage, or claims..."
							value={ragQuestion}
							onChange={(e) => setRagQuestion(e.target.value)}
						/>
					</div>
					<div className="btn-group mt-2">
						<button
							className="btn btn-primary"
							disabled={ragLoading}
							onClick={handleRagQuery}
						>
							{ragLoading ? 'Searching…' : 'Ask RAG'}
						</button>
						<button
							className="btn btn-outline"
							onClick={() => {
								setRagQuestion('');
								setRagResult(null);
								setRagError(null);
							}}
						>
							Clear
						</button>
					</div>
					{ragError && <p className="error mt-2">Error: {ragError}</p>}
					{ragResult && (
						<>
							<p className="muted mt-2">Context</p>
							<pre className="code-block mt-2">
								{typeof ragResult.context === 'string'
									? ragResult.context
									: JSON.stringify(ragResult.context, null, 2)}
							</pre>
							<p className="muted mt-2">Sources</p>
							<pre className="code-block mt-2">
								{Array.isArray(ragResult.sources)
									? ragResult.sources.join(', ')
									: JSON.stringify(ragResult.sources, null, 2)}
							</pre>
						</>
					)}
				</Card>

				<Card title="RAG Ingestion Events">
					{ragEvents.length === 0 ? (
						<EmptyState
							icon="📄"
							title="No ingestion events yet"
							description="Upload files to the monitored Google Drive folder to see updates."
						/>
					) : (
						<div className="table-wrap">
							<table className="table">
								<thead>
									<tr>
										<th>Time</th>
										<th>File</th>
										<th>Event</th>
										<th>Chunk</th>
									</tr>
								</thead>
								<tbody>
									{ragEvents.map((evt) => (
										<tr key={evt.id}>
											<td className="muted">
												{evt.at ? new Date(evt.at).toLocaleString() : '—'}
											</td>
											<td>{evt.file_name || '—'}</td>
											<td>
												<Badge
													variant={
														evt.event_type === 'deleted'
															? 'danger'
															: 'success'
													}
												>
													{evt.event_type || evt.type}
												</Badge>
											</td>
											<td>{evt.chunk_index ?? '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</Card>
			</div>

			{/* Automation Runs */}
			<Card title="Recent Automation Runs">
				{runsLoading ? (
					<Loader text="Loading runs…" />
				) : runs.length === 0 ? (
					<EmptyState
						icon="⚡"
						title="No automation runs"
						description="Trigger a workflow or wait for scheduled automations to run."
					/>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>ID</th>
									<th>Workflow</th>
									<th>Status</th>
									<th>Ran At</th>
								</tr>
							</thead>
							<tbody>
								{runs.map((r) => (
									<tr key={r.id}>
										<td className="muted">#{r.id}</td>
										<td>{r.workflow}</td>
										<td>
											<Badge
												variant={r.status === 'success' ? 'success' : 'danger'}
											>
												{r.status}
											</Badge>
										</td>
										<td>{new Date(r.ranAt).toLocaleString()}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</div>
	);
}
