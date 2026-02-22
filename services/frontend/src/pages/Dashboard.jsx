import { useState, useEffect } from 'react';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Loader from '../components/Loader';
import { getBundleName, getBundleColor } from '../lib/bundles';
import {
	fetchDashboardStats,
	fetchBundleDistribution,
	fetchConfidenceDistribution,
	fetchRecentActivity,
} from '../lib/api';

export default function Dashboard() {
	const [stats, setStats] = useState(null);
	const [bundleDist, setBundleDist] = useState([]);
	const [confDist, setConfDist] = useState([]);
	const [recent, setRecent] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([
			fetchDashboardStats(),
			fetchBundleDistribution(),
			fetchConfidenceDistribution(),
			fetchRecentActivity(),
		])
			.then(([s, b, c, r]) => {
				setStats(s);
				setBundleDist(b);
				setConfDist(c);
				setRecent(Array.isArray(r) ? r : []);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loader text="Loading dashboard…" />;

	const chartBundleData = bundleDist.map((d) => ({
		name: getBundleName(d.bundle_id),
		count: d.count,
		fill: getBundleColor(d.bundle_id),
		id: d.bundle_id,
	}));

	return (
		<div className="page">
			<h2 className="page-title">Dashboard</h2>

			{/* Summary cards */}
			<div className="stats-grid">
				<StatCard
					label="Total Leads"
					value={stats?.totalLeads ?? '—'}
					icon="📋"
					color="#38bdf8"
				/>
				<StatCard
					label="Predictions Today"
					value={stats?.predictionsToday ?? '—'}
					icon="🔮"
					color="#818cf8"
				/>
				<StatCard
					label="Avg Confidence"
					value={
						stats?.averageConfidence != null
							? `${(stats.averageConfidence * 100).toFixed(0)}%`
							: '—'
					}
					icon="📈"
					color="#34d399"
				/>
				<StatCard
					label="Overrides"
					value={stats?.overridesCount ?? '—'}
					icon="✏️"
					color="#fb923c"
				/>
			</div>

			{/* Charts */}
			<div className="grid-2">
				<Card title="Bundle Distribution">
					{chartBundleData.length === 0 ? (
						<p className="muted">No data</p>
					) : (
						<ResponsiveContainer width="100%" height={260}>
							<BarChart data={chartBundleData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#334155" />
								<XAxis
									dataKey="name"
									tick={{ fill: '#94a3b8', fontSize: 11 }}
									angle={-35}
									textAnchor="end"
									height={70}
								/>
								<YAxis tick={{ fill: '#94a3b8' }} />
								<Tooltip
									contentStyle={{
										background: '#1e293b',
										border: 'none',
										borderRadius: 8,
										color: '#e2e8f0',
									}}
								/>
								<Bar dataKey="count" radius={[4, 4, 0, 0]}>
									{chartBundleData.map((d) => (
										<Cell key={d.id} fill={d.fill} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					)}
				</Card>

				<Card title="Confidence Distribution">
					{confDist.length === 0 ? (
						<p className="muted">No data</p>
					) : (
						<ResponsiveContainer width="100%" height={260}>
							<BarChart data={confDist}>
								<CartesianGrid strokeDasharray="3 3" stroke="#334155" />
								<XAxis
									dataKey="range"
									tick={{ fill: '#94a3b8', fontSize: 12 }}
								/>
								<YAxis tick={{ fill: '#94a3b8' }} />
								<Tooltip
									contentStyle={{
										background: '#1e293b',
										border: 'none',
										borderRadius: 8,
										color: '#e2e8f0',
									}}
								/>
								<Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					)}
				</Card>
			</div>

			{/* Recent Activity */}
			<Card title="Recent Activity">
				{recent.length === 0 ? (
					<p className="muted">No recent predictions</p>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Time</th>
									<th>Top Bundle</th>
									<th>Confidence</th>
									<th>Model</th>
								</tr>
							</thead>
							<tbody>
								{recent.slice(0, 10).map((r, i) => (
									<tr key={r.id || i}>
										<td>{new Date(r.timestamp).toLocaleString()}</td>
										<td>
											<Badge variant="primary">
												{getBundleName(r.topBundle)}
											</Badge>
										</td>
										<td>{(r.confidence * 100).toFixed(1)}%</td>
										<td className="muted">{r.modelVersion || 'v0'}</td>
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
