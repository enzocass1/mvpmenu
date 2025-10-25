import { tokens } from '../../styles/tokens'
import Button from './Button'

/**
 * EmptyState Component - Shopify-like Design System
 * Shows when there's no data to display
 * NO emoji - clean minimal empty state
 */
function EmptyState({
  title,
  description,
  action,
  actionText,
  centered = true,
}) {
  const containerStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: centered ? 'center' : 'flex-start',
    textAlign: 'center',
    padding: `${tokens.spacing['3xl']} ${tokens.spacing.xl}`,
    ...(centered && {
      minHeight: '300px',
    }),
  }

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.sm,
  }

  const descriptionStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[600],
    lineHeight: tokens.typography.lineHeight.relaxed,
    maxWidth: '400px',
    marginBottom: action ? tokens.spacing.xl : 0,
  }

  return (
    <div style={containerStyles}>
      <h3 style={titleStyles}>{title}</h3>
      {description && <p style={descriptionStyles}>{description}</p>}
      {action && actionText && (
        <Button variant="primary" onClick={action}>
          {actionText}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
