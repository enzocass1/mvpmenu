import React, { useEffect } from 'react'
import { tokens } from '../../styles/tokens'

/**
 * Modal Component - Shopify-like Design System
 * Sizes: sm, md, lg, full
 * With Header, Body, Footer sections
 * Overlay backdrop, ESC to close
 * NO icons in close button - text only
 */
function Modal({
  isOpen,
  onClose,
  size = 'md',
  children,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
}) {
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, closeOnEsc, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeStyles = {
    sm: {
      maxWidth: '400px',
      width: '90%',
    },
    md: {
      maxWidth: '600px',
      width: '90%',
    },
    lg: {
      maxWidth: '800px',
      width: '90%',
    },
    full: {
      maxWidth: '100%',
      width: '100%',
      height: '100%',
      borderRadius: '0',
    },
  }

  const overlayStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: size === 'full' ? 'stretch' : 'center',
    justifyContent: 'center',
    zIndex: tokens.zIndex.modal,
    padding: size === 'full' ? 0 : tokens.spacing.lg,
    animation: 'fadeIn 200ms ease-out',
  }

  const modalStyles = {
    backgroundColor: tokens.colors.white,
    borderRadius: size === 'full' ? 0 : tokens.borderRadius.lg,
    boxShadow: tokens.shadows['2xl'],
    display: 'flex',
    flexDirection: 'column',
    maxHeight: size === 'full' ? '100%' : '90vh',
    overflow: 'hidden',
    position: 'relative',
    animation: 'slideUp 200ms ease-out',
    ...sizeStyles[size],
  }

  const closeButtonStyles = {
    position: 'absolute',
    top: tokens.spacing.md,
    right: tokens.spacing.md,
    padding: tokens.spacing.sm,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.gray[600],
    borderRadius: tokens.borderRadius.md,
    transition: tokens.transitions.base,
    zIndex: 1,
  }

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <div style={overlayStyles} onClick={handleOverlayClick}>
        <div style={modalStyles} onClick={(e) => e.stopPropagation()}>
          {showCloseButton && (
            <button
              style={closeButtonStyles}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = tokens.colors.gray[100]
                e.target.style.color = tokens.colors.black
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
                e.target.style.color = tokens.colors.gray[600]
              }}
              aria-label="Chiudi"
            >
              Chiudi
            </button>
          )}
          {children}
        </div>
      </div>
    </>
  )
}

// Modal.Header subcomponent
Modal.Header = function ModalHeader({ children }) {
  return (
    <div
      style={{
        padding: tokens.spacing.xl,
        paddingRight: tokens.spacing['4xl'],
        borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
      }}
    >
      {children}
    </div>
  )
}

// Modal.Title subcomponent
Modal.Title = function ModalTitle({ children }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: tokens.typography.fontSize['2xl'],
        fontWeight: tokens.typography.fontWeight.semibold,
        color: tokens.colors.black,
        lineHeight: tokens.typography.lineHeight.tight,
      }}
    >
      {children}
    </h2>
  )
}

// Modal.Body subcomponent
Modal.Body = function ModalBody({ children }) {
  return (
    <div
      style={{
        padding: tokens.spacing.xl,
        overflowY: 'auto',
        flex: 1,
      }}
    >
      {children}
    </div>
  )
}

// Modal.Footer subcomponent
Modal.Footer = function ModalFooter({ children }) {
  return (
    <div
      style={{
        padding: tokens.spacing.xl,
        borderTop: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
        display: 'flex',
        gap: tokens.spacing.md,
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  )
}

export default Modal
