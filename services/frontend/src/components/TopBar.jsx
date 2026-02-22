export default function TopBar() {
	const mode = import.meta.env.MODE; // 'development' or 'production'
	const isDocker = import.meta.env.VITE_BACKEND_URL ? true : false;
	const envLabel = isDocker ? 'DOCKER' : mode === 'production' ? 'PROD' : 'DEV';
	const envClass = `env-badge env-${envLabel.toLowerCase()}`;

	return (
		<header className="topbar">
			<h1 className="topbar-title">Smart Insurance Recommender</h1>
			<div className="topbar-right">
				<span className={envClass}>{envLabel}</span>
			</div>
		</header>
	);
}
