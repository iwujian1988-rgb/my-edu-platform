import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主色调 - 靛蓝
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // 辅助色 - 绿色（成功/正确）
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // 辅助色 - 红色（错误/危险）
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // 辅助色 - 黄色（警告/模糊）
        warning: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        // 灰色系
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        // Neo-Brutalism Palette
        neo: {
          bg: '#f8f9fa',
          black: '#000000',
          white: '#ffffff',
          green: '#B4F416',
          blue: '#3B82F6',
          yellow: '#FACC15',
          red: '#FF6B6B',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        // Neo-Brutalism Hard Shadows
        'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'neo-md': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
        // Status shadows (colored)
        'neo-green': '4px 4px 0px 0px #B4F416',
        'neo-yellow': '4px 4px 0px 0px #FACC15',
        'neo-red': '4px 4px 0px 0px #FF6B6B',
        'neo-blue': '4px 4px 0px 0px #3B82F6',
        // Hard Shadow System (Updated 2026-01-14)
        'hard-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'hard-md': '3px 3px 0px 0px rgba(0,0,0,1)',
        'hard-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
        'hard-green': '3px 3px 0px 0px #ccff00',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-in': 'slideInUp 300ms ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInUp: {
          from: {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
}

export default config
