import { useLocation } from 'react-router-dom';
import { Activity } from 'lucide-react';

const PAGE_TITLES = {
	'/': 'Client Workspace',
	'/chatbot': 'Chatbot',
	'/insights': 'Insights',
};

export default function TopBar() {
	const location = useLocation();
	const title = PAGE_TITLES[location.pathname] || 'Assurance Agent';

	return (
		<header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur-sm">
			<h1 className="text-base font-semibold text-foreground">{title}</h1>
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Activity className="h-3.5 w-3.5 text-success" />
				<span>System Online</span>
			</div>
		</header>
	);
}
