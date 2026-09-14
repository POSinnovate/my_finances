import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-foreground/80 mb-1.5">
            {label}
          </label>
        )}
        <div className="w-full relative">
          <textarea
            id={id}
            ref={ref}
            className={cn(
              'w-full bg-surface-elevated border border-border text-foreground placeholder:text-foreground/40 text-sm rounded-xl py-2.5 px-3.5 transition-all outline-none resize-y',
              'focus:border-primary focus:ring-1 focus:ring-primary/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-danger focus:border-danger focus:ring-danger/30',
              className
            )}
            {...props}
          />
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

Textarea.displayName = 'Textarea';
