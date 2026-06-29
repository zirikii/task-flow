import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, ...props },
  ref,
) {
  return (
    <label
      ref={ref}
      className={cn('text-sm font-medium text-fg', className)}
      {...props}
    />
  );
});
