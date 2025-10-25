import { tokens } from '../../styles/tokens'

/**
 * Badge Component - Shopify-like Design System
 * Variants: default, success, error, warning, info, premium
 * Sizes: sm, md
 * Text only - NO icons, NO emoji
 */
function Badge({
  children,
  variant = 'default',
  size = 'sm',
  ...props
}) {
  const sizeStyles = {
    sm: {
      padding: `2px ${tokens.spacing.sm}`,
      fontSize: tokens.typography.fontSize.xs,
      lineHeight: tokens.typography.lineHeight.tight,
    },
    md: {
      padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
      fontSize: tokens.typography.fontSize.sm,
      lineHeight: tokens.typography.lineHeight.tight,
    },
  }

  const variantStyles = {
    default: {
      backgroundColor: tokens.colors.gray[100],
      color: tokens.colors.gray[700],
      border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
    },
    success: {
      backgroundColor: tokens.colors.success.light,
      color: tokens.colors.success.dark,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.success.base}`,
    },
    error: {
      backgroundColor: tokens.colors.error.light,
      color: tokens.colors.error.dark,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.error.base}`,
    },
    warning: {
      backgroundColor: tokens.colors.warning.light,
      color: tokens.colors.warning.dark,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.warning.base}`,
    },
    info: {
      backgroundColor: tokens.colors.info.light,
      color: tokens.colors.info.dark,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.info.base}`,
    },
    premium: {
      backgroundColor: tokens.colors.premium.light,
      color: tokens.colors.premium.dark,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.premium.base}`,
    },
  }

  const badgeStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadius.md,
    fontWeight: tokens.typography.fontWeight.medium,
    whiteSpace: 'nowrap',
    fontFamily: tokens.typography.fontFamily.base,
    ...sizeStyles[size],
    ...variantStyles[variant],
  }

  return (
    <span style={badgeStyles} {...props}>
      {children}
    </span>
  )
}

export default Badge
