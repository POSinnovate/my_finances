import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const tabVariants = cva(
  'py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap',
  {
    variants: {
      activeColor: {
        cyan: 'bg-primary hover:bg-primary/90 text-background shadow-md shadow-primary/20',
        amber: 'bg-linear-to-r from-amber-500 to-rose-500 text-background shadow-md shadow-amber-500/20',
        emerald: 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/20',
      },
      isActive: {
        true: '',
        false: 'text-foreground/60 hover:text-foreground bg-transparent',
      },
    },
    defaultVariants: {
      activeColor: 'cyan',
      isActive: false,
    },
  }
);

export interface TabButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tabVariants> {
  isActive: boolean;
  count?: number;
  icon?: React.ReactNode;
}

export function TabButton({
  className,
  activeColor = 'cyan',
  isActive,
  count,
  icon,
  children,
  ...props
}: TabButtonProps) {
  return (
    <button
      type="button"
      className={cn(tabVariants({ activeColor, isActive, className }))}
      {...props}
    >
      {icon}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.2 rounded-md font-mono transition-colors',
            isActive ? 'bg-background/30 text-background' : 'bg-surface-elevated text-foreground/70'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export interface TabGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number;
}

export function TabGroup({ className, columns = 2, children, ...props }: TabGroupProps) {
  const colClass =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
      ? 'grid-cols-3'
      : columns === 4
      ? 'grid-cols-4'
      : 'grid-cols-2';

  return (
    <div
      className={cn(
        'bg-surface border border-border p-1 rounded-2xl grid gap-1 shadow-md',
        colClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
