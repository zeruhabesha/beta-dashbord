import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Server, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';

export function TeamSelector({ onSelectTeam }) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Interactive parralax background
    useEffect(() => {
        const handleMouseMove = (e) => {
            // Calculate mouse position relative to center
            const x = (e.clientX - window.innerWidth / 2) / 25;
            const y = (e.clientY - window.innerHeight / 2) / 25;
            setMousePosition({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const teams = [
        {
            id: 'siem',
            title: 'SIEM Operations',
            icon: ShieldAlert,
            description: 'Monitor alerts, logs, and compliance in real-time.',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'group-hover:border-blue-200',
            shadow: 'group-hover:shadow-blue-500/10'
        },
        {
            id: 'ids',
            title: 'IDS / IPS Analysis',
            icon: Activity,
            description: 'Analyze network traffic and block potential threats.',
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'group-hover:border-purple-200',
            shadow: 'group-hover:shadow-purple-500/10'
        },
        {
            id: 'edr',
            title: 'EDR Analysis',
            icon: Server,
            description: 'manage host security and isolate compromised endpoints.',
            color: 'text-cyan-600',
            bg: 'bg-cyan-50',
            border: 'group-hover:border-cyan-200',
            shadow: 'group-hover:shadow-cyan-500/10'
        },
        {
            id: 'unified',
            title: 'Unified SOC',
            icon: Layers,
            description: 'Combined view of all security modules for full visibility.',
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'group-hover:border-indigo-200',
            shadow: 'group-hover:shadow-indigo-500/10'
        }
    ];

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8fafc] overflow-hidden relative font-sans text-slate-800">
            {/* Interactive Background Layers */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Abstract Shapes with Parallax */}
                <div
                    className="absolute top-[-10%] right-[20%] w-[600px] h-[600px] rounded-full bg-blue-400/20 blur-[100px] transition-transform duration-75 ease-out mix-blend-multiply"
                    style={{ transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y * -1}px)` }}
                />
                <div
                    className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-purple-400/20 blur-[100px] transition-transform duration-75 ease-out mix-blend-multiply"
                    style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }}
                />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <div className="z-10 text-center mb-16 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-500 mb-6 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
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
                        className={`group relative flex items-start p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-left ${team.border} ${team.shadow}`}
                    >
                        <div className={`p-4 rounded-xl shrink-0 mr-5 ${team.bg} ${team.color} group-hover:scale-110 transition-transform duration-300`}>
                            <team.icon size={28} />
                        </div>

                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-slate-800">
                                {team.title}
                            </h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-4">
                                {team.description}
                            </p>

                            <div className="flex items-center text-sm font-semibold text-slate-400 group-hover:text-slate-900 transition-colors">
                                Access Module <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>

                        {/* Active Status Indicator (Mock) */}
                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                            <CheckCircle2 className={`w-5 h-5 ${team.color}`} />
                        </div>
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-slate-400 text-xs font-medium">
                SECURE ACCESS • RESTRICTED AREA
            </div>
        </div>
    );
}
