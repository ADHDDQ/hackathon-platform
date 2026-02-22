import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import { getBundleName, BUNDLE_NAMES } from '../lib/bundles';
import { fetchLeads, updateLead, postOverride } from '../lib/api';

const STATUS_OPTIONS = ['All', 'New', 'Contacted', 'Closed Won', 'Closed Lost'];
const statusVariant = {
	New: 'info',
	Contacted: 'warning',
	'Closed Won': 'success',
	'Closed Lost': 'danger',
};

export default function Leads() {
	const [leads, setLeads] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('All');
	const [selected, setSelected] = useState(null);
	const [overrideOpen, setOverrideOpen] = useState(false);
	const [overrideBundle, setOverrideBundle] = useState(0);
	const [overrideReason, setOverrideReason] = useState('');

	useEffect(() => {
		loadLeads();
	}, []);

	async function loadLeads() {
		setLoading(true);
		try {
			const data = await fetchLeads();
			setLeads(Array.isArray(data) ? data : []);
		} finally {
			setLoading(false);
		}
	}

	async function handleStatusChange(id, newStatus) {
		await updateLead(id, { status: newStatus });
		setLeads((prev) =>
			prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)),
		);
		if (selected?.id === id) setSelected((s) => ({ ...s, status: newStatus }));
	}

	async function handleOverrideSubmit() {
		if (!selected) return;
		await postOverride(selected.id, overrideBundle, overrideReason);
		setLeads((prev) =>
			prev.map((l) =>
				l.id === selected.id
					? {
							...l,
							override: { bundleId: overrideBundle, reason: overrideReason },
						}
					: l,
			),
		);
		setSelected((s) => ({
			...s,
			override: { bundleId: overrideBundle, reason: overrideReason },
		}));
		setOverrideOpen(false);
		setOverrideReason('');
	}

	const filtered = leads.filter((l) => {
		const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
		const matchesSearch =
			!search ||
			(l.customerName || l.id || '')
				.toLowerCase()
				.includes(search.toLowerCase());
		return matchesStatus && matchesSearch;
	});

	if (loading) return <Loader text="Loading leads…" />;

	return (
		<div className="page">
			<h2 className="page-title">Leads</h2>

			{/* Filters */}
			<Card>
				<div className="filters-row">
					<input
						className="input"
						type="text"
						placeholder="Search by name or ID…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<div className="filter-pills">
						{STATUS_OPTIONS.map((s) => (
							<button
								key={s}
								className={`pill${statusFilter === s ? ' pill-active' : ''}`}
								onClick={() => setStatusFilter(s)}
							>
								{s}
							</button>
						))}
					</div>
				</div>
			</Card>

			{/* Leads table */}
			{filtered.length === 0 ? (
				<EmptyState
					icon="📋"
					title="No leads found"
					description="Create a prediction and save it as a lead first."
				/>
			) : (
				<Card>
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Created</th>
									<th>Name / ID</th>
									<th>Recommended Bundle</th>
									<th>Confidence</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((l) => (
									<tr
										key={l.id}
										className="clickable"
										onClick={() => setSelected(l)}
									>
										<td>{new Date(l.createdAt).toLocaleDateString()}</td>
										<td>{l.customerName || l.id}</td>
										<td>
											<Badge variant="primary">
												{getBundleName(l.recommendedBundle)}
											</Badge>
										</td>
										<td>
											{l.confidence != null
												? `${(l.confidence * 100).toFixed(1)}%`
												: '—'}
										</td>
										<td>
											<Badge variant={statusVariant[l.status] || 'default'}>
												{l.status || 'New'}
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Card>
			)}

			{/* Lead Detail Modal */}
			<Modal
				open={!!selected}
				onClose={() => setSelected(null)}
				title={`Lead: ${selected?.customerName || selected?.id || ''}`}
			>
				{selected && (
					<div className="lead-detail">
						<div className="detail-section">
							<h4>Status</h4>
							<Badge variant={statusVariant[selected.status] || 'default'}>
								{selected.status || 'New'}
							</Badge>
						</div>

						{/* Prediction top 3 */}
						{selected.prediction && selected.prediction.length > 0 && (
							<div className="detail-section">
								<h4>Top 3 Predictions</h4>
								<div className="results-list compact">
									{selected.prediction.slice(0, 3).map((p, i) => (
										<div key={p.bundle_id} className="result-item-sm">
											<span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
											<span>{getBundleName(p.bundle_id)}</span>
											<span className="muted">
												{(p.probability * 100).toFixed(1)}%
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Override info */}
						{selected.override && (
							<div className="detail-section">
								<h4>Override</h4>
								<p>
									Bundle changed to{' '}
									<strong>{getBundleName(selected.override.bundleId)}</strong>
								</p>
								<p className="muted">Reason: {selected.override.reason}</p>
							</div>
						)}

						{/* Input data */}
						{selected.input && (
							<div className="detail-section">
								<h4>Customer Input</h4>
								<div className="detail-grid">
									{Object.entries(selected.input).map(([k, v]) => (
										<div key={k} className="detail-kv">
											<span className="muted">{k}</span>
											<span>{String(v)}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Actions */}
						<div className="detail-section">
							<h4>Actions</h4>
							<div className="btn-group">
								{selected.status !== 'Contacted' && (
									<button
										className="btn btn-sm btn-secondary"
										onClick={() => handleStatusChange(selected.id, 'Contacted')}
									>
										📞 Mark Contacted
									</button>
								)}
								{selected.status !== 'Closed Won' && (
									<button
										className="btn btn-sm btn-success"
										onClick={() =>
											handleStatusChange(selected.id, 'Closed Won')
										}
									>
										✅ Close Won
									</button>
								)}
								{selected.status !== 'Closed Lost' && (
									<button
										className="btn btn-sm btn-danger"
										onClick={() =>
											handleStatusChange(selected.id, 'Closed Lost')
										}
									>
										❌ Close Lost
									</button>
								)}
								<button
									className="btn btn-sm btn-outline"
									onClick={() => {
										setOverrideBundle(selected.recommendedBundle ?? 0);
										setOverrideOpen(true);
									}}
								>
									✏️ Override Bundle
								</button>
							</div>
						</div>

						{/* Override form */}
						{overrideOpen && (
							<div className="detail-section override-form">
								<h4>Override Bundle</h4>
								<label className="form-field">
									<span>New Bundle</span>
									<select
										value={overrideBundle}
										onChange={(e) => setOverrideBundle(Number(e.target.value))}
									>
										{Object.entries(BUNDLE_NAMES).map(([id, name]) => (
											<option key={id} value={id}>
												{name}
											</option>
										))}
									</select>
								</label>
								<label className="form-field">
									<span>Reason</span>
									<textarea
										className="input"
										rows={2}
										value={overrideReason}
										onChange={(e) => setOverrideReason(e.target.value)}
										placeholder="Why are you overriding?"
									/>
								</label>
								<div className="btn-group">
									<button
										className="btn btn-sm btn-primary"
										onClick={handleOverrideSubmit}
									>
										Save Override
									</button>
									<button
										className="btn btn-sm btn-outline"
										onClick={() => setOverrideOpen(false)}
									>
										Cancel
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</Modal>
		</div>
	);
}
