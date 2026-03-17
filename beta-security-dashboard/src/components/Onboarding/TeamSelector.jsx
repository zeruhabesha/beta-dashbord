import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Server, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';

export function TeamSelector({ onSelectTeam }) {
    const teams = [
        {
            id: 'siem',
            title: 'SIEM Operations',
            icon: ShieldAlert,
            description: 'Monitor alerts, logs, and compliance in real-time.',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'hover:border-blue-300',
            shadow: 'hover:shadow-md'
        },
        {
            id: 'ids',
            title: 'IDS / IPS Analysis',
            icon: Activity,
            description: 'Analyze network traffic and block potential threats.',
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'hover:border-purple-300',
            shadow: 'hover:shadow-md'
        },
        {
            id: 'edr',
            title: 'EDR Analysis',
            icon: Server,
            description: 'manage host security and isolate compromised endpoints.',
            color: 'text-cyan-600',
            bg: 'bg-cyan-50',
            border: 'hover:border-cyan-300',
            shadow: 'hover:shadow-md'
        },
        {
            id: 'unified',
            title: 'Unified SOC',
            icon: Layers,
            description: 'Combined view of all security modules for full visibility.',
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'hover:border-indigo-300',
            shadow: 'hover:shadow-md'
        }
    ];

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 overflow-hidden relative font-sans text-slate-800">
            {/* Simple Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            <div className="z-10 text-center mb-16 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-500 mb-6 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    System Operational
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    Select Your Operation
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                    Choose a security module to begin your session.
                </p>
            </div>

            <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl px-6 w-full">
                {teams.map((team) => (
                    <button
                        key={team.id}
                        onClick={() => onSelectTeam(team.id)}
                        className={`group relative flex items-start p-6 rounded-2xl bg-white border border-slate-200 transition-all duration-200 hover:shadow-lg text-left ${team.border}`}
                    >
                        <div className={`p-4 rounded-xl shrink-0 mr-5 ${team.bg} ${team.color} transition-transform duration-200`}>
                            <team.icon size={28} />
                        </div>

                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                {team.title}
                            </h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-4">
                                {team.description}
                            </p>

                            <div className="flex items-center text-sm font-semibold text-slate-400 group-hover:text-slate-900 transition-colors">
                                Access Module <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>

                        {/* Active Status Indicator */}
                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <CheckCircle2 className={`w-5 h-5 ${team.color}`} />
                        </div>
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-slate-400 text-xs font-medium tracking-widest">
                SECURE ACCESS • RESTRICTED AREA
            </div>
        </div>
    );
}
