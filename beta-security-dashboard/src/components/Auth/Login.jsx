import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, AlertCircle, Eye, EyeOff, ArrowRight, Activity, Command } from 'lucide-react';
import { login } from '../../api/opensearch';

export function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (!username || !password) {
                throw new Error("Please enter both username and password.");
            }

            // Simulate loading
            const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
            const loginRequest = login(username, password);
            const [user] = await Promise.all([loginRequest, minLoadTime]);

            onLoginSuccess(user.username);
        } catch (err) {
            console.error(err);
            setError(err.message || "Authentication failed. Check credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 overflow-hidden relative font-sans text-slate-800">
            {/* Simple Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />

            {/* Main Login Card */}
            <div className="relative z-10 w-full max-w-[400px] mx-4">
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 relative overflow-hidden transition-all">

                    {/* Top Accent Line - Solid Blue */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-600 mb-4 shadow-md border border-blue-700/10">
                            <span className="text-2xl font-black text-white tracking-tight">BETA</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Welcome Back</h1>
                        <p className="text-slate-500 text-sm">Sign in to access the Security Dashboard</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-sm animate-[shake_0.4s_ease-in-out]">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5 ml-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                                    <a href="#" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Forgot password?</a>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl py-3 pl-10 pr-10 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`
                                w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm
                                ${isLoading ? 'opacity-80 cursor-not-allowed' : 'active:translate-y-[1px]'}
                            `}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Link */}
                <div className="mt-8 text-center">
                    <p className="text-slate-500 text-sm">
                        Don't have an account? <a href="#" className="text-blue-600 font-semibold hover:underline">Contact Admin</a>
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
            `}</style>
        </div>
    );
}

export default Login;
