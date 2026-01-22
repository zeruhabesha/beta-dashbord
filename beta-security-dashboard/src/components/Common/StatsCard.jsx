import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

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
        primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
        success: 'bg-green-500/10 text-green-400 border-green-500/20',
        warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        danger: 'bg-red-500/10 text-red-400 border-red-500/20',
        info: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    };

    const trendIcons = {
        up: TrendingUp,
        down: TrendingDown,
        neutral: Minus
    };

    const trendColors = {
        up: 'text-green-400',
        down: 'text-red-400',
        neutral: 'text-text-muted'
    };

    const TrendIcon = trendIcons[trendDirection];

    if (loading) {
        return (
            <div className="bg-bg-card border border-border-subtle rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-bg-body rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-bg-body rounded w-3/4"></div>
            </div>
        );
    }

    return (
        <div className="bg-bg-card border border-border-subtle rounded-lg p-6 hover:border-primary-500/30 transition-all duration-200 group hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <p className="text-sm text-text-muted font-medium mb-1">{title}</p>
                    {subtitle && (
                        <p className="text-xs text-text-muted/70">{subtitle}</p>
                    )}
                </div>
                {Icon && (
                    <div className={clsx(
                        "p-3 rounded-lg border transition-all duration-200 group-hover:scale-110",
                        colorClasses[color]
                    )}>
                        <Icon size={20} />
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <p className="text-3xl font-bold text-text-main mb-1">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                    {trend && (
                        <div className={clsx("flex items-center gap-1 text-sm", trendColors[trendDirection])}>
                            <TrendIcon size={16} />
                            <span>{trend}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
