import { cn } from '../../lib/utils';
import { AlertCircle, Info } from 'lucide-react';

function EmptyState({
	icon: Icon = Info,
	title,
	description,
	children,
	className,
}) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-10 text-center',
				className,
			)}
		>
			<div className="rounded-full bg-muted p-3">
				<Icon className="h-6 w-6 text-muted-foreground" />
			</div>
			{title && (
				<h3 className="text-sm font-semibold text-foreground">{title}</h3>
			)}
			{description && (
				<p className="max-w-sm text-sm text-muted-foreground">{description}</p>
			)}
			{children && <div className="mt-2">{children}</div>}
		</div>
	);
}

function ErrorState({ message, onRetry, className }) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-center',
				className,
			)}
		>
			<div className="rounded-full bg-destructive/10 p-3">
				<AlertCircle className="h-6 w-6 text-destructive" />
			</div>
			<p className="text-sm text-destructive">
				{message || 'Something went wrong'}
			</p>
			{onRetry && (
				<button
					onClick={onRetry}
					className="mt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					Try again
				</button>
			)}
		</div>
	);
}

export { EmptyState, ErrorState };
