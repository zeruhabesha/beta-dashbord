import React from 'react';
import { AlertCircle, ArrowRight, Shield, KeyRound } from 'lucide-react';
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
        <div className="app-viewport-scale flex items-center justify-center bg-background overflow-hidden relative font-sans text-foreground">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />

            <div className="relative z-10 w-full max-w-[420px] mx-4">
                <Card className="relative overflow-hidden rounded-2xl shadow-sm transition-all">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-950 dark:bg-white" />

                    <CardHeader className="items-center text-center">
                        <div className="inline-flex items-center justify-center size-16 rounded-xl bg-primary mb-2 shadow-md border border-primary/10">
                            <Shield className="text-primary-foreground" size={28} />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Sign In With Keycloak</CardTitle>
                        <CardDescription>
                            Authentication is handled by your Keycloak realm. You will be redirected to continue.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle size={18} />
                                <AlertDescription className="font-medium">{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="button" onClick={onStartLogin} disabled={isAuthenticating} size="lg" className="w-full rounded-xl">
                            {isAuthenticating ? (
                                <>
                                    <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    <span>Redirecting to Keycloak...</span>
                                </>
                            ) : (
                                <>
                                    <KeyRound size={18} />
                                    <span>Continue With Keycloak</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </Button>

                        <Alert variant="muted" className="px-4 py-3 text-xs">
                            If the redirect does not start automatically, use the button above.
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default Login;
