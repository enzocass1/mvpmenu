import React from 'react'
import { tokens, getInputBase } from '../../styles/tokens'

/**
 * Input Component - Shopify-like Design System
 * Types: text, email, password, number, tel, url, search
 * States: default, error, disabled
 * With label and helper text support
 */
function Input({
  label,
  error,
  helperText,
  fullWidth = true,
  disabled = false,
  required = false,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  ...props
}) {
  const [isFocused, setIsFocused] = React.useState(false)
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`

  const baseStyles = getInputBase()

  const inputStyles = {
    ...baseStyles,
    width: fullWidth ? '100%' : 'auto',
    borderColor: error
      ? tokens.colors.error.base
      : isFocused
      ? tokens.colors.black
      : tokens.colors.gray[300],
    backgroundColor: disabled ? tokens.colors.gray[50] : tokens.colors.white,
    cursor: disabled ? 'not-allowed' : 'text',
    opacity: disabled ? 0.6 : 1,
  }

  const labelStyles = {
    display: 'block',
    marginBottom: tokens.spacing.xs,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: error ? tokens.colors.error.base : tokens.colors.black,
    lineHeight: tokens.typography.lineHeight.tight,
  }

  const helperTextStyles = {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.typography.fontSize.xs,
    color: error ? tokens.colors.error.base : tokens.colors.gray[600],
    lineHeight: tokens.typography.lineHeight.normal,
  }

  const containerStyles = {
    width: fullWidth ? '100%' : 'auto',
  }

  return (
    <div style={containerStyles}>
      {label && (
        <label htmlFor={inputId} style={labelStyles}>
          {label}
          {required && (
            <span style={{ color: tokens.colors.error.base, marginLeft: '2px' }}>
              *
            </span>
          )}
        </label>
      )}

      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={(e) => {
          setIsFocused(false)
          onBlur?.(e)
        }}
        onFocus={(e) => {
          setIsFocused(true)
          onFocus?.(e)
        }}
        disabled={disabled}
        required={required}
        style={inputStyles}
        {...props}
      />

      {(helperText || error) && (
        <div style={helperTextStyles}>
          {error || helperText}
        </div>
      )}
    </div>
  )
}

export default Input
