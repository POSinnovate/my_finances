import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-background font-black shadow-md shadow-primary/20 hover:brightness-110 active:scale-95',
        secondary:
          'bg-secondary hover:bg-secondary/80 border border-border text-foreground/80 hover:text-foreground font-bold active:scale-95',
        accent:
          'bg-accent text-background font-black shadow-md shadow-accent/20 hover:brightness-110 active:scale-95',
        success:
          'bg-success/15 text-success hover:bg-success/25 border border-success/30 font-black shadow-md shadow-success/20 active:scale-95',
        warning:
          'bg-warning/15 text-warning hover:bg-warning/25 border border-warning/30 font-black shadow-md shadow-warning/20 active:scale-95',
        danger:
          'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30 font-black shadow-md shadow-danger/20 active:scale-95',
        ghost:
          'text-foreground/60 hover:text-foreground hover:bg-surface-elevated/60 font-semibold',
        outline:
          'border border-border text-foreground/80 hover:border-primary hover:text-foreground bg-transparent font-bold',
      },
      size: {
        xs: 'text-[11px] py-1 px-2.5 rounded-lg',
        sm: 'text-xs py-1.5 px-3 rounded-xl',
        md: 'text-xs sm:text-sm py-2 px-4 rounded-xl',
        lg: 'text-sm sm:text-base py-2.5 px-5 rounded-2xl',
        icon: 'p-2 rounded-xl',
        'icon-sm': 'p-1.5 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, isLoading, icon: IconProp, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : IconProp ? (
          React.isValidElement(IconProp) ? (
            IconProp
          ) : (
            React.createElement(IconProp as React.ElementType, {
              className: 'w-4 h-4 shrink-0',
            })
          )
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
