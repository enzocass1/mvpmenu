import React from 'react'
import { tokens, getInputBase } from '../../styles/tokens'

/**
 * Select Component - Shopify-like Design System
 * Dropdown select with label and error states
 * NO custom icons - native select styling
 */
function Select({
  label,
  error,
  helperText,
  fullWidth = true,
  disabled = false,
  required = false,
  id,
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  children,
  options = [],
  ...props
}) {
  const [isFocused, setIsFocused] = React.useState(false)
  const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`

  const baseStyles = getInputBase()

  const selectStyles = {
    ...baseStyles,
    width: fullWidth ? '100%' : 'auto',
    borderColor: error
      ? tokens.colors.error.base
      : isFocused
      ? tokens.colors.black
      : tokens.colors.gray[300],
    backgroundColor: disabled ? tokens.colors.gray[50] : tokens.colors.white,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `right ${tokens.spacing.md} center`,
    backgroundSize: '16px',
    paddingRight: tokens.spacing['2xl'],
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
        <label htmlFor={selectId} style={labelStyles}>
          {label}
          {required && (
            <span style={{ color: tokens.colors.error.base, marginLeft: '2px' }}>
              *
            </span>
          )}
        </label>
      )}

      <select
        id={selectId}
        name={name}
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
        style={selectStyles}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.length > 0
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>

      {(helperText || error) && (
        <div style={helperTextStyles}>
          {error || helperText}
        </div>
      )}
    </div>
  )
}

export default Select
