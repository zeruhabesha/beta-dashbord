import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export const StatsCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendDirection = 'neutral',
    color = 'primary',
    subtitle,
    loading = false
}) => {
    const colorClasses = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        success: 'bg-success/10 text-success border-success/20',
        warning: 'bg-warning/10 text-warning border-warning/25',
        danger: 'bg-destructive/10 text-destructive border-destructive/20',
        info: 'bg-info/10 text-info border-info/25'
    };

    const trendIcons = {
        up: TrendingUp,
        down: TrendingDown,
        neutral: Minus
    };

    const TrendIcon = trendIcons[trendDirection];

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Skeleton className="mb-4 h-4 w-1/2" />
                    <Skeleton className="h-8 w-3/4" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="group transition-colors duration-200 hover:border-primary/30">
            <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                        <p className="mb-1 text-sm font-medium text-text-muted">{title}</p>
                    {subtitle && (
                        <p className="text-xs text-text-muted/70">{subtitle}</p>
                    )}
                </div>
                {Icon && (
                    <div className={cn(
                        "rounded-lg border p-3 transition-colors duration-200",
                        colorClasses[color]
                    )}>
                        <Icon size={20} />
                    </div>
                )}
            </div>

                <div className="flex items-end justify-between">
                    <div>
                    <p className="mb-1 text-3xl font-bold text-text-main">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                    {trend && (
                        <Badge variant={trendDirection === 'up' ? 'success' : trendDirection === 'down' ? 'destructive' : 'secondary'} className="gap-1">
                            <TrendIcon size={16} />
                            <span>{trend}</span>
                        </Badge>
                    )}
                </div>
            </div>
            </CardContent>
        </Card>
    );
};
