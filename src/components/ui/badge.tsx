import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 font-black uppercase tracking-wider select-none shrink-0 transition-colors',
  {
    variants: {
      variant: {
        cyan: 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-300',
        emerald: 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300',
        rose: 'bg-rose-950/70 border border-rose-500/40 text-rose-300',
        amber: 'bg-amber-950/70 border border-amber-500/40 text-amber-300',
        purple: 'bg-purple-950/70 border border-purple-500/40 text-purple-300',
        secondary: 'bg-[#102A43] border border-[#243B55] text-slate-300',
        outline: 'border border-slate-700 text-slate-400',
      },
      size: {
        sm: 'text-[9px] px-1.5 py-0.2 rounded',
        md: 'text-[10px] px-2 py-0.5 rounded-full',
        pill: 'text-[10px] font-bold px-2 py-0.5 rounded-md font-mono',
      },
    },
    defaultVariants: {
      variant: 'cyan',
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
