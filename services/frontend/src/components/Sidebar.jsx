import { NavLink } from 'react-router-dom';

const links = [
	{ to: '/', label: 'Dashboard', icon: '📊' },
	{ to: '/new-customer', label: 'New Customer', icon: '👤' },
	{ to: '/leads', label: 'Leads', icon: '📋' },
	{ to: '/predictions', label: 'Predictions Log', icon: '🔮' },
	{ to: '/automations', label: 'Automations', icon: '⚡' },
	{ to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
	return (
		<aside className="sidebar">
			<div className="sidebar-brand">
				<span className="sidebar-logo">🛡️</span>
				<span className="sidebar-title">Insurance AI</span>
			</div>
			<nav className="sidebar-nav">
				{links.map((l) => (
					<NavLink
						key={l.to}
						to={l.to}
						end={l.to === '/'}
						className={({ isActive }) =>
							`sidebar-link${isActive ? ' active' : ''}`
						}
					>
						<span className="sidebar-icon">{l.icon}</span>
						<span>{l.label}</span>
					</NavLink>
				))}
			</nav>
			<div className="sidebar-footer">
				<small>v1.0.0</small>
			</div>
		</aside>
	);
}
