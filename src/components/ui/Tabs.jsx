import React from 'react'
import { tokens } from '../../styles/tokens'

/**
 * Tabs Component - Shopify-like Design System
 * Horizontal tabs navigation
 * NO icons - text only tabs
 */
function Tabs({
  tabs,
  activeTab,
  onChange,
  fullWidth = false,
}) {
  const containerStyles = {
    display: 'flex',
    borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
    gap: fullWidth ? 0 : tokens.spacing.sm,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  }

  const tabStyles = (isActive) => ({
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: isActive ? tokens.typography.fontWeight.semibold : tokens.typography.fontWeight.medium,
    color: isActive ? tokens.colors.black : tokens.colors.gray[600],
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${isActive ? tokens.colors.black : 'transparent'}`,
    cursor: 'pointer',
    transition: tokens.transitions.base,
    whiteSpace: 'nowrap',
    fontFamily: tokens.typography.fontFamily.base,
    outline: 'none',
    ...(fullWidth && {
      flex: 1,
      textAlign: 'center',
    }),
  })

  const [hoveredTab, setHoveredTab] = React.useState(null)

  return (
    <div style={containerStyles}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value
        const isHovered = hoveredTab === tab.value

        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            style={{
              ...tabStyles(isActive),
              ...(isHovered && !isActive && {
                color: tokens.colors.black,
                backgroundColor: tokens.colors.gray[50],
              }),
            }}
            onMouseEnter={() => setHoveredTab(tab.value)}
            onMouseLeave={() => setHoveredTab(null)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
