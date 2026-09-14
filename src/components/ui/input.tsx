import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, helperText, icon, leftIcon, rightIcon, error, id, ...props }, ref) => {
    const effectiveLeftIcon = leftIcon || icon;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-foreground/80 mb-1.5">
            {label}
          </label>
        )}
        <div className="w-full relative">
          {effectiveLeftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none flex items-center justify-center">
              {effectiveLeftIcon}
            </div>
          )}
          <input
            id={id}
            type={type}
            ref={ref}
            className={cn(
              'w-full bg-surface-elevated border border-border text-foreground placeholder:text-foreground/40 text-sm rounded-xl py-2.5 px-3.5 transition-all outline-none',
              'focus:border-primary focus:ring-1 focus:ring-primary/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              effectiveLeftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-danger focus:border-danger focus:ring-danger/30',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none flex items-center justify-center">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';
