import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 font-black uppercase tracking-wider select-none shrink-0 transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary/15 border border-primary/40 text-primary',
        secondary: 'bg-secondary/60 border border-border text-foreground/80',
        accent: 'bg-accent/15 border border-accent/40 text-accent',
        success: 'bg-success/15 border border-success/40 text-success',
        danger: 'bg-danger/15 border border-danger/40 text-danger',
        warning: 'bg-warning/15 border border-warning/40 text-warning',
        info: 'bg-info/15 border border-info/40 text-info',
        outline: 'border border-border text-foreground/60',

        // Legacy compatibility
        cyan: 'bg-primary/15 border border-primary/40 text-primary',
        emerald: 'bg-success/15 border border-success/40 text-success',
        rose: 'bg-danger/15 border border-danger/40 text-danger',
        amber: 'bg-warning/15 border border-warning/40 text-warning',
        purple: 'bg-purple-950/70 border border-purple-500/40 text-purple-300',
      },
      size: {
        sm: 'text-[9px] px-1.5 py-0.5 rounded-md',
        md: 'text-[10px] px-2 py-0.5 rounded-full',
        pill: 'text-[10px] font-bold px-2 py-0.5 rounded-md font-mono',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}
