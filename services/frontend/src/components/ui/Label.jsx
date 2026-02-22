import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Label = forwardRef(({ className, ...props }, ref) => {
	return (
		<label
			ref={ref}
			className={cn(
				'text-xs font-medium leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
				className,
			)}
			{...props}
		/>
	);
});
Label.displayName = 'Label';

export { Label };
