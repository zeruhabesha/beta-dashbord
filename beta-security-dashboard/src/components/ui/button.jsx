import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'bg-gradient-to-r from-primary to-info text-primary-foreground shadow-sm shadow-primary/25 hover:brightness-105',
                destructive: 'bg-gradient-to-r from-destructive to-status-high text-destructive-foreground shadow-sm shadow-destructive/25 hover:brightness-105',
                success: 'bg-gradient-to-r from-success to-emerald-500 text-success-foreground shadow-sm shadow-success/25 hover:brightness-105',
                warning: 'bg-gradient-to-r from-warning to-amber-500 text-warning-foreground shadow-sm shadow-warning/25 hover:brightness-105',
                info: 'bg-gradient-to-r from-info to-primary text-info-foreground shadow-sm shadow-info/25 hover:brightness-105',
                accent: 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-sm shadow-primary/25 hover:brightness-105',
                cancel: 'border border-destructive bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground',
                outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                infoOutline: 'border border-info/40 bg-info/10 text-info hover:bg-info hover:text-info-foreground',
                warningOutline: 'border border-warning/40 bg-warning/10 text-warning hover:bg-warning hover:text-warning-foreground',
                successOutline: 'border border-success/40 bg-success/10 text-success hover:bg-success hover:text-success-foreground',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline'
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'size-10'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
