import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import { getBundleName } from '../lib/bundles';
import { fetchPredictionsLog } from '../lib/api';

function downloadCSV(data) {
	if (!data.length) return;
	const headers = ['timestamp', 'topBundle', 'confidence', 'modelVersion'];
	const rows = data.map((r) =>
		[
			r.timestamp,
			getBundleName(r.topBundle),
			r.confidence,
			r.modelVersion || 'v0',
		].join(','),
	);
	const csv = [headers.join(','), ...rows].join('\n');
	const blob = new Blob([csv], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `predictions-${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

export default function PredictionsLog() {
	const [preds, setPreds] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchPredictionsLog()
			.then((data) => setPreds(Array.isArray(data) ? data : []))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loader text="Loading predictions…" />;

	return (
		<div className="page">
			<h2 className="page-title">Predictions Log</h2>

			<Card
				title={`${preds.length} prediction${preds.length !== 1 ? 's' : ''}`}
				actions={
					preds.length > 0 && (
						<button
							className="btn btn-sm btn-secondary"
							onClick={() => downloadCSV(preds)}
						>
							📥 Export CSV
						</button>
					)
				}
			>
				{preds.length === 0 ? (
					<EmptyState
						icon="🔮"
						title="No predictions yet"
						description="Run a prediction on the New Customer page to see entries here."
					/>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Timestamp</th>
									<th>Top Bundle</th>
									<th>Confidence</th>
									<th>Model Version</th>
								</tr>
							</thead>
							<tbody>
								{preds.map((p, i) => (
									<tr key={p.id || i}>
										<td>{new Date(p.timestamp).toLocaleString()}</td>
										<td>
											<Badge variant="primary">
												{getBundleName(p.topBundle)}
											</Badge>
										</td>
										<td>
											{p.confidence != null
												? `${(p.confidence * 100).toFixed(1)}%`
												: '—'}
										</td>
										<td className="muted">{p.modelVersion || 'v0'}</td>
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
