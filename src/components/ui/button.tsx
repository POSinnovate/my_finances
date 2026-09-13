import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-black shadow-md shadow-[#00ADB5]/20 hover:brightness-110 active:scale-95',
        secondary:
          'bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-slate-300 hover:text-white font-bold',
        emerald:
          'bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black shadow-md shadow-emerald-400/20 active:scale-95',
        amber:
          'bg-linear-to-r from-amber-500 to-rose-500 text-[#0B192C] font-black shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95',
        danger:
          'bg-[#102A43] hover:bg-rose-500/20 border border-[#243B55] text-slate-400 hover:text-rose-400',
        ghost:
          'text-slate-400 hover:text-white hover:bg-[#102A43]/50',
        outline:
          'border border-[#243B55] text-slate-300 hover:border-[#00ADB5] hover:text-white bg-transparent',
      },
      size: {
        sm: 'text-xs py-1.5 px-3 rounded-xl',
        md: 'text-xs sm:text-sm py-2 px-3.5 rounded-xl',
        lg: 'text-xs sm:text-sm py-2.5 px-4 rounded-xl',
        icon: 'p-1.5 rounded-xl',
        'icon-sm': 'p-1 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
