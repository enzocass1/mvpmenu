import { tokens } from '../../styles/tokens'

/**
 * Alert Component - Shopify-like Design System
 * Variants: info, success, warning, error
 */
function Alert({
  children,
  variant = 'info',
  onClose,
  className,
  ...props
}) {
  const variantStyles = {
    info: {
      backgroundColor: '#EBF5FF',
      borderColor: '#2563EB',
      color: '#1E40AF',
      icon: 'ℹ️',
    },
    success: {
      backgroundColor: '#F0FDF4',
      borderColor: '#16A34A',
      color: '#166534',
      icon: '✅',
    },
    warning: {
      backgroundColor: '#FFFBEB',
      borderColor: '#F59E0B',
      color: '#92400E',
      icon: '⚠️',
    },
    error: {
      backgroundColor: '#FEF2F2',
      borderColor: '#DC2626',
      color: '#991B1B',
      icon: '❌',
    },
  }

  const currentStyle = variantStyles[variant]

  const baseStyles = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: tokens.borderRadius.md,
    backgroundColor: currentStyle.backgroundColor,
    border: `1px solid ${currentStyle.borderColor}`,
    color: currentStyle.color,
    fontSize: '14px',
    lineHeight: '1.5',
    position: 'relative',
  }

  return (
    <div style={baseStyles} className={className} {...props}>
      <span style={{ flexShrink: 0, fontSize: '16px' }}>
        {currentStyle.icon}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '18px',
            color: currentStyle.color,
            opacity: 0.6,
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Close alert"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default Alert
