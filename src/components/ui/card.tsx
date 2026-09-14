import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const cardVariants = cva('transition-all', {
  variants: {
    variant: {
      default: 'bg-surface border border-border rounded-3xl shadow-xl',
      elevated: 'bg-surface-elevated border border-border/70 rounded-2xl shadow-md',
      interactive:
        'bg-surface border border-border hover:border-primary/50 rounded-3xl shadow-xl cursor-pointer',
      glass: 'bg-surface/80 border border-border/80 rounded-3xl shadow-2xl backdrop-blur-xl',
    },
    padding: {
      none: 'p-0',
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-5',
      lg: 'p-6 sm:p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, className }))}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1 pb-3 sm:pb-4 border-b border-border/60', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-base font-black text-foreground tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-foreground/60 font-medium', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-3 sm:pt-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 border-t border-border/60', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';
