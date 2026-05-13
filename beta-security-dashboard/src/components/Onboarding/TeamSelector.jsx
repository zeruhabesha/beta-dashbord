import React from 'react';
import { ShieldAlert, Activity, Server, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function TeamSelector({ onSelectTeam }) {
    const teams = [
        {
            id: 'siem',
            title: 'SIEM Operations',
            icon: ShieldAlert,
            description: 'Monitor alerts, logs, and compliance in real-time.',
            color: 'text-neutral-950',
            bg: 'bg-neutral-50',
            border: 'hover:border-primary/40'
        },
        {
            id: 'ids',
            title: 'IDS / IPS Analysis',
            icon: Activity,
            description: 'Analyze network traffic and block potential threats.',
            color: 'text-neutral-950',
            bg: 'bg-neutral-50',
            border: 'hover:border-primary/40'
        },
        {
            id: 'edr',
            title: 'EDR Analysis',
            icon: Server,
            description: 'manage host security and isolate compromised endpoints.',
            color: 'text-neutral-950',
            bg: 'bg-neutral-50',
            border: 'hover:border-primary/40'
        },
        {
            id: 'unified',
            title: 'Unified SOC',
            icon: Layers,
            description: 'Combined view of all security modules for full visibility.',
            color: 'text-neutral-950',
            bg: 'bg-neutral-50',
            border: 'hover:border-primary/40'
        },
        {
            id: 'observability',
            title: 'OTel Observability',
            icon: Activity,
            description: 'Live performance metrics, distributed traces, and log analytics.',
            color: 'text-neutral-950',
            bg: 'bg-neutral-50',
            border: 'hover:border-primary/40'
        }
    ];

    return (
        <div className="app-viewport-scale flex flex-col items-center justify-center bg-background overflow-hidden relative font-sans text-foreground">
            {/* Simple Grid Overlay */}


            <div className="z-10 text-center mb-16 relative">
                <Badge variant="muted" className="mb-6 gap-2 rounded-full px-3 py-1 uppercase tracking-wider">
                    <span className="size-2 rounded-full bg-success"></span>
                    System Operational
                </Badge>
                <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
                    Select Your Operation
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Choose a security module to begin your session.
                </p>
            </div>

            <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl px-6 w-full">
                {teams.map((team) => (
                    <Card key={team.id} className={`group relative transition-colors duration-200 ${team.border}`}>
                        <button
                            type="button"
                            onClick={() => onSelectTeam(team.id)}
                            className="flex w-full items-start p-6 text-left"
                        >
                            <div className={`p-4 rounded-xl shrink-0 mr-5 ${team.bg} ${team.color} transition-transform duration-200`}>
                                <team.icon size={28} />
                            </div>

                            <CardContent className="flex-1 p-0">
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    {team.title}
                                </h3>
                                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                                    {team.description}
                                </p>

                                <div className="flex items-center text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                                    Access Module <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                                </div>
                            </CardContent>

                            {/* Active Status Indicator */}
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <CheckCircle2 className={`size-5 ${team.color}`} />
                            </div>
                        </button>
                    </Card>
                ))}
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-muted-foreground text-xs font-medium tracking-widest">
                SECURE ACCESS • RESTRICTED AREA
            </div>
        </div>
    );
}
