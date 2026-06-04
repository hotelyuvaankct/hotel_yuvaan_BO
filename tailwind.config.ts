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
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
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
                gold: {
                    50: '#fefcf3',
                    100: '#fef7e0',
                    200: '#fcecc0',
                    300: '#f9d895',
                    400: '#f5c068',
                    500: '#f2a944',
                    600: '#e39429',
                    700: '#bc7b1f',
                    800: '#976220',
                    900: '#7a511e',
                },
                bronze: {
                    50: '#faf8f3',
                    100: '#f4ede0',
                    200: '#e7d8c0',
                    300: '#d7bd95',
                    400: '#c59d68',
                    500: '#b88244',
                    600: '#a66d39',
                    700: '#8a5730',
                    800: '#70472b',
                    900: '#5c3c26',
                }
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            keyframes: {
                'accordion-down': {
                    from: {
                        height: '0'
                    },
                    to: {
                        height: 'var(--radix-accordion-content-height)'
                    }
                },
                'accordion-up': {
                    from: {
                        height: 'var(--radix-accordion-content-height)'
                    },
                    to: {
                        height: '0'
                    }
                },
                'fade-in-up': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(30px)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)'
                    }
                },
                'fade-in-left': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateX(-30px)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateX(0)'
                    }
                },
                'fade-in-right': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateX(30px)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateX(0)'
                    }
                },
                'scale-in': {
                    '0%': {
                        opacity: '0',
                        transform: 'scale(0.9)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'scale(1)'
                    }
                },
                'shimmer': {
                    '0%': {
                        transform: 'translateX(-100%)'
                    },
                    '100%': {
                        transform: 'translateX(100%)'
                    }
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
                'playfair': ['Playfair Display', 'serif'],
                'inter': ['Inter', 'sans-serif'],
            }
        }
    },
    plugins: [tailwindcssAnimate],
} satisfies Config;