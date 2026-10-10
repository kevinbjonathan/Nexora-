/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#111713',
          50: '#F6F7F5',
          100: '#E8EBE6',
          200: '#CDD3C8',
          300: '#A7B0A0',
          400: '#747B73',
          500: '#4A5249',
          600: '#2D332E',
          700: '#1D231F',
          800: '#151A17',
          900: '#111713',
        },
        forest: {
          DEFAULT: '#183C31',
          light: '#285847',
          50: '#EEF4F0',
          100: '#D4E5DC',
          200: '#A8CBB8',
          300: '#6B9E83',
          400: '#3A6E54',
          500: '#285847',
          600: '#183C31',
          700: '#122D24',
          800: '#0D1F19',
          900: '#091512',
        },
        lime: {
          DEFAULT: '#C8E46A',
          dark: '#A8C950',
          light: '#E0F0A0',
        },
        ivory: '#F6F5EF',
        danger: '#B94C43',
        warning: '#B87924',
        border: '#E2E5DC',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-2xl': ['clamp(2.5rem, 7vw, 5.5rem)', { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '400' }],
        'display-xl': ['clamp(2rem, 5vw, 3.75rem)', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '400' }],
        'display-lg': ['clamp(1.75rem, 4vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '400' }],
        'display-md': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '400' }],
      },
      letterSpacing: {
        'eyebrow': '0.18em',
      },
      maxWidth: {
        'prose-narrow': '38rem',
        'prose-editorial': '48rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.7s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.7s ease-out forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'scroll-cue': 'scrollCue 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        scrollCue: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(8px)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
