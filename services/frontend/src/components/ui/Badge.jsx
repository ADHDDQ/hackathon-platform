import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
	'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors',
	{
		variants: {
			variant: {
				default: 'bg-primary/10 text-primary ring-primary/20',
				secondary: 'bg-secondary text-secondary-foreground ring-border',
				destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
				outline: 'bg-transparent text-foreground ring-border',
				success: 'bg-success/10 text-success ring-success/20',
				warning: 'bg-warning/10 text-warning ring-warning/20',
				info: 'bg-info/10 text-info ring-info/20',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

function Badge({ className, variant, ...props }) {
	return (
		<span className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
