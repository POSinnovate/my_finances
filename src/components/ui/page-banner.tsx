import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const pageBannerVariants = cva(
  'p-4 sm:p-5 rounded-3xl bg-[#102A43] border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all',
  {
    variants: {
      theme: {
        cyan: 'border-[#243B55] hover:border-cyan-500/30',
        emerald: 'border-emerald-500/30',
        amber: 'border-amber-500/30',
        purple: 'border-purple-500/30',
      },
    },
    defaultVariants: {
      theme: 'cyan',
    },
  }
);

const iconContainerVariants = cva('p-1.5 rounded-xl shrink-0 flex items-center justify-center', {
  variants: {
    theme: {
      cyan: 'bg-cyan-500/15 text-cyan-400',
      emerald: 'bg-emerald-500/15 text-emerald-400',
      amber: 'bg-amber-500/15 text-amber-400',
      purple: 'bg-purple-500/15 text-purple-400',
    },
  },
  defaultVariants: {
    theme: 'cyan',
  },
});

const badgeVariants = cva('text-[10px] font-bold px-2 py-0.5 rounded-full border', {
  variants: {
    theme: {
      cyan: 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300',
      emerald: 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300',
      amber: 'bg-amber-950/60 border-amber-500/30 text-amber-300',
      purple: 'bg-purple-950/60 border-purple-500/30 text-purple-300',
    },
  },
  defaultVariants: {
    theme: 'cyan',
  },
});

const actionButtonVariants = cva(
  'w-full sm:w-auto py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all whitespace-nowrap cursor-pointer shrink-0 select-none',
  {
    variants: {
      theme: {
        cyan: 'bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] shadow-[#00ADB5]/20 hover:brightness-110',
        emerald: 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-400/20',
        amber: 'bg-linear-to-r from-amber-500 to-rose-500 text-[#0B192C] shadow-amber-500/20 hover:brightness-110',
        purple: 'bg-linear-to-r from-purple-500 to-indigo-500 text-white shadow-purple-500/20 hover:brightness-110',
      },
    },
    defaultVariants: {
      theme: 'cyan',
    },
  }
);

export interface PageBannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageBannerVariants> {
  icon: React.ReactNode;
  title: string;
  description: string;
  badgeText?: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export function PageBanner({
  className,
  theme = 'cyan',
  icon,
  title,
  description,
  badgeText,
  actionText,
  onAction,
  actionIcon,
  ...props
}: PageBannerProps) {
  const currentTheme = theme || 'cyan';

  return (
    <div className={cn(pageBannerVariants({ theme: currentTheme, className }))} {...props}>
      <div className="space-y-1 max-w-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={iconContainerVariants({ theme: currentTheme })}>{icon}</div>
          <h2 className="text-base font-black text-white tracking-tight">{title}</h2>
          {badgeText && <span className={badgeVariants({ theme: currentTheme })}>{badgeText}</span>}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
      </div>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={actionButtonVariants({ theme: currentTheme })}
        >
          {actionIcon || <Plus className="w-4 h-4 stroke-[3px]" />}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}
