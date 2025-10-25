// Design Tokens - Shopify-like Design System
// NO emoji, NO icons - Clean minimal aesthetic

export const tokens = {
  colors: {
    // Grayscale
    white: '#FFFFFF',
    black: '#000000',
    gray: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },

    // Status colors (text only, no icons)
    success: {
      base: '#16A34A',
      light: '#BBF7D0',
      dark: '#166534',
    },
    error: {
      base: '#DC2626',
      light: '#FECACA',
      dark: '#991B1B',
    },
    warning: {
      base: '#EA580C',
      light: '#FED7AA',
      dark: '#9A3412',
    },
    info: {
      base: '#0284C7',
      light: '#BAE6FD',
      dark: '#075985',
    },

    // Premium badge color
    premium: {
      base: '#9333EA',
      light: '#E9D5FF',
      dark: '#6B21A8',
    },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '80px',
  },

  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  typography: {
    fontFamily: {
      base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '13px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '30px',
      '5xl': '36px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '2xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  borders: {
    width: {
      none: '0',
      thin: '1px',
      medium: '2px',
      thick: '4px',
    },
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
}

// Helper function to get responsive styles
export const getResponsiveValue = (mobile, desktop) => ({
  base: mobile,
  lg: desktop,
})

// Helper for creating consistent button styles
export const getButtonBase = () => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: tokens.borderRadius.md,
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  lineHeight: tokens.typography.lineHeight.tight,
  transition: tokens.transitions.base,
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
  fontFamily: tokens.typography.fontFamily.base,
  whiteSpace: 'nowrap',
  userSelect: 'none',
})

// Helper for creating consistent input styles
export const getInputBase = () => ({
  width: '100%',
  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
  fontSize: tokens.typography.fontSize.sm,
  lineHeight: tokens.typography.lineHeight.normal,
  borderRadius: tokens.borderRadius.md,
  border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
  backgroundColor: tokens.colors.white,
  color: tokens.colors.black,
  fontFamily: tokens.typography.fontFamily.base,
  transition: tokens.transitions.base,
  outline: 'none',
  boxSizing: 'border-box',
})

export default tokens
