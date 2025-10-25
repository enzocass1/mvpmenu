import { tokens } from '../../styles/tokens'
import Card from './Card'

/**
 * KPICard Component - Shopify-like Design System
 * Card for displaying key metrics on dashboard
 * NO icons/emoji - clean text only
 * Optional trend indicator (text only)
 */
function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendDirection, // 'up', 'down', 'neutral'
  onClick,
}) {
  const trendColors = {
    up: tokens.colors.success.base,
    down: tokens.colors.error.base,
    neutral: tokens.colors.gray[600],
  }

  const trendText = {
    up: '↑',
    down: '↓',
    neutral: '→',
  }

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.gray[600],
    lineHeight: tokens.typography.lineHeight.tight,
    marginBottom: tokens.spacing.sm,
  }

  const valueStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    lineHeight: tokens.typography.lineHeight.tight,
    marginBottom: tokens.spacing.xs,
  }

  const subtitleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray[500],
    lineHeight: tokens.typography.lineHeight.normal,
  }

  const trendStyles = {
    marginTop: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: trendDirection ? trendColors[trendDirection] : tokens.colors.gray[600],
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  }

  return (
    <Card variant="default" padding="lg" hoverable={!!onClick} onClick={onClick}>
      <p style={titleStyles}>{title}</p>
      <h2 style={valueStyles}>{value}</h2>
      {subtitle && <p style={subtitleStyles}>{subtitle}</p>}
      {trend && trendDirection && (
        <div style={trendStyles}>
          <span>{trendText[trendDirection]}</span>
          <span>{trend}</span>
        </div>
      )}
    </Card>
  )
}

export default KPICard
