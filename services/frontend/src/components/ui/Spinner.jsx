import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

function Spinner({ className, size = 'default', ...props }) {
	const sizeClasses = {
		sm: 'h-4 w-4',
		default: 'h-6 w-6',
		lg: 'h-8 w-8',
	};

	return (
		<Loader2
			className={cn(
				'animate-spin text-muted-foreground',
				sizeClasses[size],
				className,
			)}
			{...props}
		/>
	);
}

function FullPageSpinner({ label = 'Loading…' }) {
	return (
		<div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
			<Spinner size="lg" />
			<span className="text-sm">{label}</span>
		</div>
	);
}

export { Spinner, FullPageSpinner };
