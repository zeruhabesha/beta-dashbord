import React from 'react';
import { AlertCircle, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Login({ onStartLogin, error, isAuthenticating = false }) {
    const hasStartedRef = React.useRef(false);

    React.useEffect(() => {
        if (!onStartLogin || error || isAuthenticating || hasStartedRef.current) {
            return;
        }

        hasStartedRef.current = true;

        const timerId = window.setTimeout(() => {
            onStartLogin();
        }, 150);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [error, isAuthenticating, onStartLogin]);

    return (
        <div className="app-viewport-scale relative flex min-h-screen items-center justify-center overflow-hidden bg-background font-sans">

            
            <div className="relative z-10 w-full max-w-[440px] mx-4">
                <Card className="overflow-hidden">
                    <CardHeader className="items-center pb-6 pt-10 text-center">
                        <div className="mb-4 inline-flex size-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <ShieldCheck className="size-8" />
                        </div>
                        <h2 className="mb-1 text-[11px] font-black uppercase tracking-[0.3em] text-primary">
                            Enterprise Security
                        </h2>
                        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Unified SOC Platform</CardTitle>
                        <CardDescription className="px-4 text-sm text-muted-foreground">
                            Secure identity-based authentication via Keycloak for managed security services.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-6 px-8 pb-10">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle size={18} className="shrink-0" />
                                <AlertDescription className="text-xs font-bold leading-tight">{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button 
                            type="button" 
                            onClick={onStartLogin} 
                            disabled={isAuthenticating} 
                            className="h-12 w-full text-xs font-bold uppercase tracking-widest"
                        >
                            {isAuthenticating ? (
                                <div className="flex items-center gap-3">
                                    <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                                    <span>Authorizing...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <KeyRound size={18} />
                                    <span>Sign In with Keycloak</span>
                                    <ArrowRight size={18} className="ml-1 opacity-50" />
                                </div>
                            )}
                        </Button>

                        <div className="flex items-center justify-center gap-4 border-t py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Managed Environment
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default Login;
