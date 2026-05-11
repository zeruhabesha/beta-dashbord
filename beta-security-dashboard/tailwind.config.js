import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                    400: '#60a5fa',
                    500: '#2563eb',
                    600: '#1d4ed8',
                },
                bg: {
                    body: 'var(--bg-body)',
                    sidebar: 'var(--bg-sidebar)',
                    card: 'var(--bg-card)',
                    input: 'var(--bg-input)',
                    glass: 'var(--bg-glass)',
                },
                border: {
                    DEFAULT: 'hsl(var(--border))',
                    subtle: 'var(--border-subtle)'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                    primary: 'var(--accent-primary)',
                    glow: 'var(--accent-glow)'
                },
                text: {
                    main: 'var(--text-main)',
                    muted: 'var(--text-muted)',
                    accent: 'var(--text-accent)'
                },
                status: {
                    critical: 'var(--status-critical)',
                    high: 'var(--status-high)',
                    medium: 'var(--status-medium)',
                    low: 'var(--status-low)',
                    info: 'var(--status-info)'
                },
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                success: {
                    DEFAULT: 'hsl(var(--success))',
                    foreground: 'hsl(var(--success-foreground))'
                },
                warning: {
                    DEFAULT: 'hsl(var(--warning))',
                    foreground: 'hsl(var(--warning-foreground))'
                },
                info: {
                    DEFAULT: 'hsl(var(--info))',
                    foreground: 'hsl(var(--info-foreground))'
                },
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))'
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            borderColor: {
                DEFAULT: 'hsl(var(--border))',
                border: 'hsl(var(--border))',
                subtle: 'var(--border-subtle)',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            }
        },
    },
    plugins: [animate],
}
