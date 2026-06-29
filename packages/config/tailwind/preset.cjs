/**
 * Shared Tailwind v3 preset with TaskFlow design tokens.
 * Consumed by apps/web and packages/ui via `presets: [require('@taskflow/config/tailwind/preset')]`.
 * Presentation-only: colors, radii, spacing, typography, shadows.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Neutral surface scale
        bg: '#f7f7f4',
        fg: '#26251e',
        card: '#ffffff',
        muted: '#6b7280',
        border: '#e5e7eb',
        // Brand accent
        accent: {
          DEFAULT: '#f54e00',
          fg: '#ffffff',
          subtle: '#fff1ea',
        },
        // Status colors (kanban columns)
        status: {
          backlog: '#94a3b8',
          todo: '#6366f1',
          progress: '#f59e0b',
          done: '#22c55e',
        },
        // Priority colors
        priority: {
          none: '#9ca3af',
          low: '#60a5fa',
          medium: '#f59e0b',
          high: '#f97316',
          urgent: '#ef4444',
        },
        danger: {
          DEFAULT: '#dc2626',
          fg: '#ffffff',
          subtle: '#fee2e2',
        },
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        modal: '0 10px 38px -10px rgba(0, 0, 0, 0.35), 0 10px 20px -15px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
