import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px'
            }
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                /* Primary = Hotel_Yuvaan gold family (not blue) */
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                    50: 'hsl(var(--primary-50))',
                    100: 'hsl(var(--primary-100))',
                    200: 'hsl(var(--primary-200))',
                    300: 'hsl(var(--primary-300))',
                    400: 'hsl(var(--primary-400))',
                    500: 'hsl(var(--primary-500))',
                    600: 'hsl(var(--primary-600))',
                    700: 'hsl(var(--primary-700))',
                    800: 'hsl(var(--primary-800))',
                    900: 'hsl(var(--primary-900))',
                },
                /* Warm cream / stone neutrals */
                neutral: {
                    0: 'hsl(var(--neutral-0))',
                    50: 'hsl(var(--neutral-50))',
                    100: 'hsl(var(--neutral-100))',
                    200: 'hsl(var(--neutral-200))',
                    300: 'hsl(var(--neutral-300))',
                    400: 'hsl(var(--neutral-400))',
                    500: 'hsl(var(--neutral-500))',
                    600: 'hsl(var(--neutral-600))',
                    700: 'hsl(var(--neutral-700))',
                    800: 'hsl(var(--neutral-800))',
                    900: 'hsl(var(--neutral-900))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                },
                brand: {
                    DEFAULT: 'hsl(var(--brand))',
                    foreground: 'hsl(var(--brand-foreground))',
                    hover: 'hsl(var(--brand-hover))',
                    muted: 'hsl(var(--brand-muted))',
                },
                /* Legacy gold aliases → primary CSS vars (existing variant="gold" keeps working) */
                gold: {
                    DEFAULT: 'hsl(var(--gold))',
                    strong: 'hsl(var(--gold-strong))',
                    bright: 'hsl(var(--gold-bright))',
                    deep: 'hsl(var(--gold-deep))',
                    border: 'hsl(var(--gold-border))',
                    muted: 'hsl(var(--gold-muted))',
                    50: 'hsl(var(--primary-50))',
                    100: 'hsl(var(--primary-100))',
                    200: 'hsl(var(--primary-200))',
                    300: 'hsl(var(--primary-200))',
                    400: 'hsl(var(--primary-400))',
                    500: 'hsl(var(--primary-500))',
                    600: 'hsl(var(--primary-600))',
                    700: 'hsl(var(--primary-700))',
                    800: 'hsl(var(--brand-muted))',
                    900: 'hsl(var(--brand))',
                },
                surface: {
                    DEFAULT: 'hsl(var(--surface))',
                    elevated: 'hsl(var(--surface-elevated))',
                },
                success: {
                    DEFAULT: 'hsl(var(--success))',
                    foreground: 'hsl(var(--success-foreground))',
                    50: 'hsl(var(--success-50))',
                    500: 'hsl(var(--success-500))',
                    600: 'hsl(var(--success-600))',
                    700: 'hsl(var(--success-700))',
                },
                warning: {
                    DEFAULT: 'hsl(var(--warning))',
                    foreground: 'hsl(var(--warning-foreground))',
                    50: 'hsl(var(--warning-50))',
                    500: 'hsl(var(--warning-500))',
                    600: 'hsl(var(--warning-600))',
                    700: 'hsl(var(--warning-700))',
                },
                /* Legacy aliases — prefer destructive in new code */
                danger: {
                    DEFAULT: 'hsl(var(--destructive))',
                    50: 'hsl(var(--danger-50))',
                    500: 'hsl(var(--danger-500))',
                    600: 'hsl(var(--danger-600))',
                    700: 'hsl(var(--danger-700))',
                },
                /* Default glass backdrop opacity. (Used by bg-overlay in custom modals) */
                overlay: 'hsl(var(--overlay) / 0.25)',
            },
            /* Radius chain off --radius (0.625rem). xl/2xl/full stay Tailwind defaults. */
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                'fade-in-left': {
                    '0%': { opacity: '0', transform: 'translateX(-30px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' }
                },
                'fade-in-right': {
                    '0%': { opacity: '0', transform: 'translateX(30px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' }
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' }
                },
                'shimmer': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' }
                },
                'marquee': {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-100%)' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in-up': 'fade-in-up 0.6s ease-out',
                'fade-in-left': 'fade-in-left 0.6s ease-out',
                'fade-in-right': 'fade-in-right 0.6s ease-out',
                'scale-in': 'scale-in 0.6s ease-out',
                'shimmer': 'shimmer 2s infinite',
                'marquee': 'marquee 25s linear infinite',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                inter: ['Inter', 'sans-serif'],
                playfair: ['Playfair Display', 'serif'],
            }
        }
    },
    plugins: [tailwindcssAnimate],
} satisfies Config;
