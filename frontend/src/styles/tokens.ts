/**
 * TRACEFORGE Design System - Obsidian Studio Design Tokens
 * 
 * Cinematic near-black foundation, electric-orange accents,
 * editorial typography, sophisticated surfaces, and subtle motion.
 */

export const tokens = {
  colors: {
    // Foundations
    page: '#0B0D0F',
    surface: {
      primary: '#121519',
      secondary: '#191D22',
      elevated: '#22272E',
    },
    border: {
      subtle: '#2A3038',
      strong: '#3B434D',
    },
    text: {
      primary: '#F5F5F5',
      secondary: '#B0B7C3',
      muted: '#858E9B',
    },
    accent: {
      primary: '#FF6B35',
      hover: '#FF8559',
      subtle: '#321E17',
      focus: '#FF9B73',
    },
    semantic: {
      success: '#34D399',
      warning: '#FBBF24',
      error: '#FB7185',
      info: '#60A5FA',
    },
  },
  typography: {
    fonts: {
      sans: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'Geist Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    },
    sizes: {
      display: 'clamp(2.5rem, 5vw + 1rem, 5rem)', // 40-48px mobile, 64-80px desktop
      h1: 'clamp(2.25rem, 4vw + 0.5rem, 4rem)',   // 36-42px mobile, 48-64px desktop
      h2: 'clamp(1.75rem, 3vw + 0.25rem, 2.75rem)',// 28-34px mobile, 36-44px desktop
      h3: 'clamp(1.375rem, 2vw + 0.125rem, 1.75rem)',// 22-24px mobile, 24-28px desktop
      bodyLarge: '1.125rem', // 18px
      body: '1rem',          // 16px
      caption: '0.875rem',   // 14px
      metadata: '0.75rem',   // 12px
      micro: '0.6875rem',    // 11px
    },
    lineHeights: {
      display: '1.08',
      headline: '1.15',
      body: '1.6',
      tight: '1.25',
    },
    letterSpacing: {
      tighter: '-0.035em',
      tight: '-0.02em',
      normal: '0',
      wide: '0.04em',
      widest: '0.08em',
    },
  },
  spacing: {
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    sidebar: {
      width: '256px',
      collapsedWidth: '72px',
    },
    header: {
      height: '64px',
    },
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px',
  },
  shadows: {
    subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
    elevated: '0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 2px 6px -1px rgba(0, 0, 0, 0.4)',
    modal: '0 24px 48px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px #2A3038',
    accent: '0 0 20px -3px rgba(255, 107, 53, 0.25)',
  },
  transitions: {
    fast: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
    standard: '180ms cubic-bezier(0.16, 1, 0.3, 1)',
    panel: '240ms cubic-bezier(0.16, 1, 0.3, 1)',
    emphasis: '360ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const

export type DesignTokens = typeof tokens
