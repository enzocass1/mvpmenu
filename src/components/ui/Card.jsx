import { tokens } from '../../styles/tokens'

/**
 * Card Component - Shopify-like Design System
 * Variants: default, outlined, elevated
 * Padding options: none, sm, md, lg
 */
function Card({
  children,
  variant = 'default',
  padding = 'md',
  className,
  onClick,
  hoverable = false,
  ...props
}) {
  const paddingStyles = {
    none: '0',
    sm: tokens.spacing.md,
    md: tokens.spacing.lg,
    lg: tokens.spacing.xl,
  }

  const variantStyles = {
    default: {
      backgroundColor: tokens.colors.white,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
      boxShadow: tokens.shadows.none,
    },
    outlined: {
      backgroundColor: tokens.colors.white,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
      boxShadow: tokens.shadows.none,
    },
    elevated: {
      backgroundColor: tokens.colors.white,
      border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
      boxShadow: tokens.shadows.md,
    },
  }

  const baseStyles = {
    borderRadius: tokens.borderRadius.lg,
    padding: paddingStyles[padding],
    transition: tokens.transitions.base,
    ...variantStyles[variant],
  }

  const hoverStyles = hoverable
    ? {
        cursor: 'pointer',
        ':hover': {
          boxShadow: tokens.shadows.lg,
          border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[400]}`,
        },
      }
    : {}

  const [isHovered, setIsHovered] = React.useState(false)

  const cardStyles = {
    ...baseStyles,
    ...(hoverable && isHovered && hoverStyles[':hover']),
    ...(hoverable && { cursor: 'pointer' }),
  }

  const handleClick = (e) => {
    if (onClick) {
      onClick(e)
    }
  }

  return (
    <div
      style={cardStyles}
      className={className}
      onClick={handleClick}
      onMouseEnter={() => hoverable && setIsHovered(true)}
      onMouseLeave={() => hoverable && setIsHovered(false)}
      {...props}
    >
      {children}
    </div>
  )
}

// Card.Header subcomponent
Card.Header = function CardHeader({ children, className }) {
  return (
    <div
      style={{
        marginBottom: tokens.spacing.lg,
        paddingBottom: tokens.spacing.md,
        borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
      }}
      className={className}
    >
      {children}
    </div>
  )
}

// Card.Title subcomponent
Card.Title = function CardTitle({ children, className }) {
  return (
    <h3
      style={{
        margin: 0,
        fontSize: tokens.typography.fontSize.lg,
        fontWeight: tokens.typography.fontWeight.semibold,
        color: tokens.colors.black,
        lineHeight: tokens.typography.lineHeight.tight,
      }}
      className={className}
    >
      {children}
    </h3>
  )
}

// Card.Description subcomponent
Card.Description = function CardDescription({ children, className }) {
  return (
    <p
      style={{
        margin: `${tokens.spacing.xs} 0 0 0`,
        fontSize: tokens.typography.fontSize.sm,
        color: tokens.colors.gray[600],
        lineHeight: tokens.typography.lineHeight.normal,
      }}
      className={className}
    >
      {children}
    </p>
  )
}

// Card.Footer subcomponent
Card.Footer = function CardFooter({ children, className }) {
  return (
    <div
      style={{
        marginTop: tokens.spacing.lg,
        paddingTop: tokens.spacing.md,
        borderTop: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
        display: 'flex',
        gap: tokens.spacing.sm,
        alignItems: 'center',
      }}
      className={className}
    >
      {children}
    </div>
  )
}

import React from 'react'

export default Card
