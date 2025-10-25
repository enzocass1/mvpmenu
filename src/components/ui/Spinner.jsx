import { tokens } from '../../styles/tokens'

/**
 * Spinner Component - Shopify-like Design System
 * Loading indicator with optional text
 * Sizes: sm, md, lg
 * NO emoji - clean minimal spinner
 */
function Spinner({
  size = 'md',
  text,
  centered = false,
}) {
  const sizeStyles = {
    sm: {
      width: '20px',
      height: '20px',
      borderWidth: '2px',
    },
    md: {
      width: '40px',
      height: '40px',
      borderWidth: '3px',
    },
    lg: {
      width: '60px',
      height: '60px',
      borderWidth: '4px',
    },
  }

  const spinnerStyles = {
    ...sizeStyles[size],
    border: `${sizeStyles[size].borderWidth} solid ${tokens.colors.gray[200]}`,
    borderTopColor: tokens.colors.black,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  }

  const containerStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.md,
    ...(centered && {
      minHeight: '200px',
    }),
  }

  const textStyles = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[600],
    fontWeight: tokens.typography.fontWeight.medium,
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={containerStyles}>
        <div style={spinnerStyles} />
        {text && <p style={textStyles}>{text}</p>}
      </div>
    </>
  )
}

export default Spinner
