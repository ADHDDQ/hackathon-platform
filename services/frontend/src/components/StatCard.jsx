export default function StatCard({
	label,
	value,
	icon,
	color = 'var(--accent)',
}) {
	return (
		<div className="stat-card">
			<div className="stat-icon" style={{ background: color + '22', color }}>
				{icon}
			</div>
			<div className="stat-info">
				<span className="stat-value">{value}</span>
				<span className="stat-label">{label}</span>
			</div>
		</div>
	);
}
