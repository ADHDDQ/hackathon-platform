import { NavLink } from 'react-router-dom';
import {
	LayoutDashboard,
	MessageCircle,
	BarChart3,
	Shield,
} from 'lucide-react';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
	{ to: '/', label: 'Client Workspace', icon: LayoutDashboard },
	{ to: '/chatbot', label: 'Chatbot', icon: MessageCircle },
	{ to: '/insights', label: 'Insights', icon: BarChart3 },
];

export default function Sidebar() {
	return (
		<aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar">
			{/* Brand */}
			<div className="flex items-center gap-2.5 px-5 py-5">
				<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
					<Shield className="h-4 w-4 text-primary-foreground" />
				</div>
				<div className="flex flex-col">
					<span className="text-sm font-bold tracking-tight text-foreground">
						Assurance Agent
					</span>
					<span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
						Insurance AI
					</span>
				</div>
			</div>

			{/* Nav */}
			<nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
				{NAV_ITEMS.map(({ to, label, icon: Icon }) => (
					<NavLink
						key={to}
						to={to}
						end={to === '/'}
						className={({ isActive }) =>
							cn(
								'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
								isActive
									? 'bg-sidebar-active text-sidebar-active-foreground'
									: 'text-sidebar-foreground hover:bg-sidebar-active/50 hover:text-sidebar-active-foreground',
							)
						}
					>
						<Icon className="h-4 w-4 shrink-0" />
						{label}
					</NavLink>
				))}
			</nav>

			{/* Footer */}
			<div className="border-t border-border px-5 py-4">
				<p className="text-[10px] text-muted-foreground">
					v1.0 &middot; DataQuest Hackathon
				</p>
			</div>
		</aside>
	);
}
