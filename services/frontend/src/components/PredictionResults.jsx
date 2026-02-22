import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { getBundleName, getBundleColor } from '../lib/bundles';

export default function PredictionResults({ prediction }) {
	if (!prediction?.prediction?.length) return null;

	const results = prediction.prediction;
	const top = results[0];
	const topPct = (top.probability * 100).toFixed(1);
	const maxProb = results[0].probability;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Prediction Results</CardTitle>
			</CardHeader>
			<CardContent className="space-y-5">
				{/* Top recommendation */}
				<div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
					<div className="mb-1 text-xs font-medium text-muted-foreground">
						Recommended Bundle
					</div>
					<div className="flex items-center gap-3">
						<span className="text-lg font-bold text-foreground">
							{getBundleName(top.bundle_id)}
						</span>
						<Badge variant="success">{topPct}%</Badge>
					</div>
					{/* Confidence bar */}
					<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-all duration-500"
							style={{ width: `${topPct}%` }}
						/>
					</div>
				</div>

				{/* Top 3 */}
				{results.length > 1 && (
					<div className="space-y-2">
						<div className="text-xs font-medium text-muted-foreground">
							Top {Math.min(3, results.length)} Bundles
						</div>
						{results.slice(0, 3).map((r, i) => {
							const pct = (r.probability * 100).toFixed(1);
							const barWidth = (r.probability / maxProb) * 100;
							return (
								<div key={r.bundle_id} className="flex items-center gap-3">
									<span className="w-3 text-xs font-bold text-muted-foreground">
										{i + 1}
									</span>
									<div className="flex-1 space-y-1">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-foreground">
												{getBundleName(r.bundle_id)}
											</span>
											<span className="text-xs tabular-nums text-muted-foreground">
												{pct}%
											</span>
										</div>
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
											<div
												className="h-full rounded-full transition-all duration-500"
												style={{
													width: `${barWidth}%`,
													backgroundColor: getBundleColor(r.bundle_id),
												}}
											/>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Full distribution table */}
				{results.length > 3 && (
					<details className="group">
						<summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
							Show all {results.length} bundles
						</summary>
						<div className="mt-2 overflow-hidden rounded-lg border border-border">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border bg-muted/50">
										<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
											Bundle
										</th>
										<th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
											Probability
										</th>
									</tr>
								</thead>
								<tbody>
									{results.map((r) => (
										<tr
											key={r.bundle_id}
											className="border-b border-border last:border-0"
										>
											<td className="px-3 py-1.5 font-medium text-foreground">
												{getBundleName(r.bundle_id)}
											</td>
											<td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
												{(r.probability * 100).toFixed(2)}%
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</details>
				)}

				{/* Meta */}
				<div className="flex items-center gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
					{prediction.model_version && (
						<span>Model: {prediction.model_version}</span>
					)}
					{prediction.timestamp && (
						<span>{new Date(prediction.timestamp).toLocaleString()}</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
