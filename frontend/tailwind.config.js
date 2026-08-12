/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontSize: {
        /* B2B readable typography scale */
        '2xs':  ['0.6875rem', { lineHeight: '1rem' }],       /* 11px  — micro labels */
        'xs':   ['0.75rem',   { lineHeight: '1.125rem' }],   /* 12px  — captions, badges */
        'sm':   ['0.8125rem', { lineHeight: '1.25rem' }],    /* 13px  — secondary text */
        'base': ['0.875rem',  { lineHeight: '1.375rem' }],   /* 14px  — body default */
        'md':   ['0.9375rem', { lineHeight: '1.5rem' }],     /* 15px  — emphasized body */
        'lg':   ['1.0625rem', { lineHeight: '1.625rem' }],   /* 17px  — section titles */
        'xl':   ['1.25rem',   { lineHeight: '1.75rem' }],    /* 20px  — page headings */
        '2xl':  ['1.5rem',    { lineHeight: '2rem' }],       /* 24px  — hero headings */
        '3xl':  ['1.875rem',  { lineHeight: '2.25rem' }],    /* 30px  — display */
        '4xl':  ['2.25rem',   { lineHeight: '2.75rem' }],    /* 36px  — large display */
      },
      boxShadow: {
        'glow-brand': '0 0 20px -5px rgba(37, 99, 235, 0.3)',
        'glow-sm': '0 0 10px -3px rgba(37, 99, 235, 0.15)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.03)',
        'nav': '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        'table-row': '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
        'soft': '0 2px 8px -1px rgba(0, 0, 0, 0.06)',
        'elevated': '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
