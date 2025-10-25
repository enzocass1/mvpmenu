import React, { useEffect } from 'react'
import { tokens } from '../../styles/tokens'

/**
 * Toast Component - Shopify-like Design System
 * Notification toast for success, error, warning, info
 * NO icons/emoji - clean text only
 * Auto-dismiss after duration
 */
function Toast({
  message,
  type = 'info',
  onClose,
  duration = 4000,
  position = 'bottom-right',
}) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const typeStyles = {
    success: {
      backgroundColor: tokens.colors.success.base,
      borderColor: tokens.colors.success.dark,
    },
    error: {
      backgroundColor: tokens.colors.error.base,
      borderColor: tokens.colors.error.dark,
    },
    warning: {
      backgroundColor: tokens.colors.warning.base,
      borderColor: tokens.colors.warning.dark,
    },
    info: {
      backgroundColor: tokens.colors.info.base,
      borderColor: tokens.colors.info.dark,
    },
  }

  const positionStyles = {
    'top-right': {
      top: tokens.spacing.lg,
      right: tokens.spacing.lg,
    },
    'top-left': {
      top: tokens.spacing.lg,
      left: tokens.spacing.lg,
    },
    'bottom-right': {
      bottom: tokens.spacing.lg,
      right: tokens.spacing.lg,
    },
    'bottom-left': {
      bottom: tokens.spacing.lg,
      left: tokens.spacing.lg,
    },
    'top-center': {
      top: tokens.spacing.lg,
      left: '50%',
      transform: 'translateX(-50%)',
    },
    'bottom-center': {
      bottom: tokens.spacing.lg,
      left: '50%',
      transform: 'translateX(-50%)',
    },
  }

  const toastStyles = {
    position: 'fixed',
    ...positionStyles[position],
    ...typeStyles[type],
    color: tokens.colors.white,
    padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
    borderRadius: tokens.borderRadius.md,
    boxShadow: tokens.shadows.xl,
    zIndex: tokens.zIndex.tooltip,
    maxWidth: '400px',
    minWidth: '300px',
    animation: 'slideIn 0.3s ease-out',
    border: `${tokens.borders.width.thin} solid`,
  }

  const contentStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.md,
  }

  const messageStyles = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.lineHeight.normal,
    flex: 1,
  }

  const closeButtonStyles = {
    background: 'transparent',
    border: 'none',
    color: tokens.colors.white,
    cursor: 'pointer',
    fontSize: tokens.typography.fontSize.lg,
    padding: 0,
    lineHeight: 1,
    opacity: 0.8,
    transition: tokens.transitions.base,
  }

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(${position.includes('bottom') ? '20px' : '-20px'}) ${
          position.includes('center') ? 'translateX(-50%)' : ''
        };
            }
            to {
              opacity: 1;
              transform: translateY(0) ${position.includes('center') ? 'translateX(-50%)' : ''};
            }
          }
        `}
      </style>
      <div style={toastStyles}>
        <div style={contentStyles}>
          <span style={messageStyles}>{message}</span>
          <button
            onClick={onClose}
            style={closeButtonStyles}
            onMouseEnter={(e) => (e.target.style.opacity = '1')}
            onMouseLeave={(e) => (e.target.style.opacity = '0.8')}
            aria-label="Chiudi notifica"
          >
            ×
          </button>
        </div>
      </div>
    </>
  )
}

export default Toast
