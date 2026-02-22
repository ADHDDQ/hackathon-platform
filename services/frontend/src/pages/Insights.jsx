import { useState, useEffect } from 'react';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { fetchPredictions, getLocalPredictions } from '../lib/api';
import { getBundleName, getBundleColor } from '../lib/bundles';
import { BarChart3, TrendingUp, Package } from 'lucide-react';

export default function Insights() {
	const [predictions, setPredictions] = useState(null);
	const [loading, setLoading] = useState(true);
	const [source, setSource] = useState('');

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		try {
			const serverData = await fetchPredictions(200);
			if (serverData && Array.isArray(serverData) && serverData.length > 0) {
				setPredictions(serverData);
				setSource('server');
			} else {
				const local = getLocalPredictions();
				setPredictions(local);
				setSource('local');
			}
		} catch {
			const local = getLocalPredictions();
			setPredictions(local);
			setSource('local');
		} finally {
			setLoading(false);
		}
	}

	if (loading) return <FullPageSpinner label="Loading insights…" />;

	if (!predictions || predictions.length === 0) {
		return (
			<div className="space-y-6">
				<Card>
					<CardContent className="py-10">
						<EmptyState
							icon={BarChart3}
							title="No prediction data yet"
							description="Run some predictions in the Client Workspace to see insights here."
						/>
					</CardContent>
				</Card>
			</div>
		);
	}

	/* ── Compute stats ────────────────────────────────────────── */
	const bundleCounts = {};
	let totalConf = 0;
	let confCount = 0;

	for (const p of predictions) {
		const bundleId = p.topBundle ?? p.prediction?.[0]?.bundle_id;
		if (bundleId != null) {
			bundleCounts[bundleId] = (bundleCounts[bundleId] || 0) + 1;
		}
		const conf = p.confidence ?? p.prediction?.[0]?.probability;
		if (conf != null) {
			totalConf += conf;
			confCount++;
		}
	}

	const avgConfidence = confCount > 0 ? totalConf / confCount : 0;
	const bundleDistribution = Object.entries(bundleCounts)
		.map(([id, count]) => ({ bundle_id: Number(id), count }))
		.sort((a, b) => b.count - a.count);

	const maxCount = Math.max(...bundleDistribution.map((d) => d.count), 1);

	/* ── Confidence buckets ────────────────────────────────────── */
	const confBuckets = {
		'Very Low (0-20%)': 0,
		'Low (20-40%)': 0,
		'Medium (40-60%)': 0,
		'High (60-80%)': 0,
		'Very High (80-100%)': 0,
	};
	for (const p of predictions) {
		const conf = p.confidence ?? p.prediction?.[0]?.probability ?? 0;
		const pct = conf * 100;
		if (pct < 20) confBuckets['Very Low (0-20%)']++;
		else if (pct < 40) confBuckets['Low (20-40%)']++;
		else if (pct < 60) confBuckets['Medium (40-60%)']++;
		else if (pct < 80) confBuckets['High (60-80%)']++;
		else confBuckets['Very High (80-100%)']++;
	}
	const maxBucket = Math.max(...Object.values(confBuckets), 1);

	const statCards = [
		{
			icon: BarChart3,
			label: 'Total Predictions',
			value: predictions.length,
			color: 'text-info',
			bg: 'bg-info/10',
		},
		{
			icon: TrendingUp,
			label: 'Avg Confidence',
			value: `${(avgConfidence * 100).toFixed(1)}%`,
			color: 'text-success',
			bg: 'bg-success/10',
		},
		{
			icon: Package,
			label: 'Unique Bundles',
			value: bundleDistribution.length,
			color: 'text-primary',
			bg: 'bg-primary/10',
		},
	];

	return (
		<div className="space-y-6">
			{/* Summary stats */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{statCards.map(({ icon: Icon, label, value, color, bg }) => (
					<Card key={label}>
						<CardContent className="flex items-center gap-4 py-5">
							<div
								className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}
							>
								<Icon className={`h-5 w-5 ${color}`} />
							</div>
							<div className="flex flex-col">
								<span className="text-xl font-bold tabular-nums text-foreground">
									{value}
								</span>
								<span className="text-xs text-muted-foreground">{label}</span>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<p className="text-xs text-muted-foreground">
				Data source:{' '}
				<Badge variant={source === 'server' ? 'success' : 'warning'}>
					{source === 'server' ? 'Server' : 'Local Storage'}
				</Badge>
			</p>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Bundle distribution */}
				<Card>
					<CardHeader>
						<CardTitle>Bundle Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-hidden rounded-lg border border-border">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border bg-muted/50">
										<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
											Bundle
										</th>
										<th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
											Count
										</th>
										<th className="w-1/2 px-3 py-2"></th>
									</tr>
								</thead>
								<tbody>
									{bundleDistribution.map((d) => (
										<tr
											key={d.bundle_id}
											className="border-b border-border last:border-0"
										>
											<td className="px-3 py-2 font-medium text-foreground">
												{getBundleName(d.bundle_id)}
											</td>
											<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
												{d.count}
											</td>
											<td className="px-3 py-2">
												<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
													<div
														className="h-full rounded-full transition-all"
														style={{
															width: `${(d.count / maxCount) * 100}%`,
															backgroundColor: getBundleColor(d.bundle_id),
														}}
													/>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>

				{/* Confidence distribution */}
				<Card>
					<CardHeader>
						<CardTitle>Confidence Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-hidden rounded-lg border border-border">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border bg-muted/50">
										<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
											Range
										</th>
										<th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
											Count
										</th>
										<th className="w-1/2 px-3 py-2"></th>
									</tr>
								</thead>
								<tbody>
									{Object.entries(confBuckets).map(([range, count]) => (
										<tr
											key={range}
											className="border-b border-border last:border-0"
										>
											<td className="px-3 py-2 text-foreground">{range}</td>
											<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
												{count}
											</td>
											<td className="px-3 py-2">
												<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
													<div
														className="h-full rounded-full bg-primary transition-all"
														style={{
															width: `${(count / maxBucket) * 100}%`,
														}}
													/>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Recent predictions */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Predictions</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-hidden rounded-lg border border-border">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border bg-muted/50">
									<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
										Time
									</th>
									<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
										Top Bundle
									</th>
									<th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
										Confidence
									</th>
									<th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
										Model
									</th>
								</tr>
							</thead>
							<tbody>
								{predictions.slice(0, 30).map((p, i) => {
									const bundleId =
										p.topBundle ?? p.prediction?.[0]?.bundle_id ?? '—';
									const conf = p.confidence ?? p.prediction?.[0]?.probability;
									const ts = p.timestamp
										? new Date(p.timestamp).toLocaleString()
										: '—';
									return (
										<tr
											key={p.id || i}
											className="border-b border-border last:border-0"
										>
											<td className="px-3 py-2 text-muted-foreground">{ts}</td>
											<td className="px-3 py-2 font-medium text-foreground">
												{typeof bundleId === 'number'
													? getBundleName(bundleId)
													: bundleId}
											</td>
											<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
												{conf != null ? `${(conf * 100).toFixed(1)}%` : '—'}
											</td>
											<td className="px-3 py-2 text-right text-muted-foreground">
												{p.modelVersion || p.model_version || '—'}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
