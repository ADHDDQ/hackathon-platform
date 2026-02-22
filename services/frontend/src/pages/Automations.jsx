import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import { triggerN8n, fetchAutomationRuns } from '../lib/api';

export default function Automations() {
	const [triggerLoading, setTriggerLoading] = useState(false);
	const [triggerResult, setTriggerResult] = useState(null);
	const [triggerError, setTriggerError] = useState(null);
	const [runs, setRuns] = useState([]);
	const [runsLoading, setRunsLoading] = useState(true);

	const isDev = import.meta.env.MODE === 'development';

	useEffect(() => {
		fetchAutomationRuns()
			.then((data) => setRuns(Array.isArray(data) ? data : []))
			.finally(() => setRunsLoading(false));
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
