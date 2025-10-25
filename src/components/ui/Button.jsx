import { tokens, getButtonBase } from '../../styles/tokens'

/**
 * Button Component - Shopify-like Design System
 * Variants: primary, secondary, outline, ghost, danger
 * Sizes: sm, md, lg
 * NO icons, NO emoji - Clean text only
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles = getButtonBase()

  const sizeStyles = {
    sm: {
      padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
      fontSize: tokens.typography.fontSize.xs,
      minHeight: '32px',
    },
    md: {
      padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
      fontSize: tokens.typography.fontSize.sm,
      minHeight: '36px',
    },
    lg: {
      padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
      fontSize: tokens.typography.fontSize.base,
      minHeight: '44px',
    },
  }

  const variantStyles = {
    primary: {
      backgroundColor: tokens.colors.black,
      color: tokens.colors.white,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.black}`,
      ':hover': !disabled && {
        backgroundColor: tokens.colors.gray[800],
        border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[800]}`,
      },
      ':active': !disabled && {
        backgroundColor: tokens.colors.gray[900],
        border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[900]}`,
      },
    },
    secondary: {
      backgroundColor: tokens.colors.gray[100],
      color: tokens.colors.black,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
      ':hover': !disabled && {
        backgroundColor: tokens.colors.gray[200],
      },
      ':active': !disabled && {
        backgroundColor: tokens.colors.gray[300],
      },
    },
    outline: {
      backgroundColor: tokens.colors.white,
      color: tokens.colors.black,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[400]}`,
      ':hover': !disabled && {
        backgroundColor: tokens.colors.gray[50],
        border: `${tokens.borders.width.thin} solid ${tokens.colors.black}`,
      },
      ':active': !disabled && {
        backgroundColor: tokens.colors.gray[100],
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: tokens.colors.black,
      border: `${tokens.borders.width.thin} solid transparent`,
      ':hover': !disabled && {
        backgroundColor: tokens.colors.gray[100],
      },
      ':active': !disabled && {
        backgroundColor: tokens.colors.gray[200],
      },
    },
    danger: {
      backgroundColor: tokens.colors.error.base,
      color: tokens.colors.white,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.error.base}`,
      ':hover': !disabled && {
        backgroundColor: tokens.colors.error.dark,
        border: `${tokens.borders.width.thin} solid ${tokens.colors.error.dark}`,
      },
      ':active': !disabled && {
        backgroundColor: '#7F1D1D',
        border: `${tokens.borders.width.thin} solid #7F1D1D`,
      },
    },
  }

  const buttonStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled || loading ? 0.5 : 1,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    pointerEvents: disabled || loading ? 'none' : 'auto',
  }

  const [isHovered, setIsHovered] = React.useState(false)
  const [isActive, setIsActive] = React.useState(false)

  const currentStyles = {
    ...buttonStyles,
    ...(isHovered && variantStyles[variant][':hover']),
    ...(isActive && variantStyles[variant][':active']),
  }

  return (
    <button
      type={type}
      style={currentStyles}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsActive(false)
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      {...props}
    >
      {loading ? 'Caricamento...' : children}
    </button>
  )
}

// Need React import for useState
import React from 'react'

export default Button
