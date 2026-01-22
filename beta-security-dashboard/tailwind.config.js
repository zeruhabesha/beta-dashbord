/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: {
                    body: 'var(--bg-body)',
                    sidebar: 'var(--bg-sidebar)',
                    card: 'var(--bg-card)',
                    input: 'var(--bg-input)',
                },
                border: {
                    subtle: 'var(--border-subtle)'
                },
                accent: {
                    primary: 'var(--accent-primary)',
                    glow: 'var(--accent-glow)'
                },
                text: {
                    main: 'var(--text-main)',
                    muted: 'var(--text-muted)'
                },
                status: {
                    critical: 'var(--status-critical)',
                    high: 'var(--status-high)',
                    low: 'var(--status-low)'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
