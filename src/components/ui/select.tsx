import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, helperText, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-foreground/80 mb-1.5">
            {label}
          </label>
        )}
        <div className="w-full relative">
          <select
            id={id}
            ref={ref}
            className={cn(
              'w-full appearance-none bg-surface-elevated border border-border text-foreground text-sm rounded-xl py-2.5 pl-3.5 pr-9 transition-all outline-none cursor-pointer',
              'focus:border-primary focus:ring-1 focus:ring-primary/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-danger focus:border-danger focus:ring-danger/30',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="w-4 h-4 text-foreground/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        {error && (
          <span className="text-[11px] text-danger font-medium mt-1 block">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span className="text-[11px] text-foreground/50 mt-1 block">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
