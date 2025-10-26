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
  const [hoveredTab, setHoveredTab] = React.useState(null)
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768)

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const containerStyles = {
    display: 'flex',
    borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
    gap: fullWidth ? 0 : tokens.spacing.sm,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  }

  const tabStyles = (isActive) => ({
    padding: isMobile ? '8px 12px' : `${tokens.spacing.md} ${tokens.spacing.lg}`,
    fontSize: isMobile ? '11px' : tokens.typography.fontSize.sm,
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

  return (
    <>
      {/* Hide scrollbar styles */}
      <style>{`
        /* Hide scrollbar but keep functionality */}
        .tabs-container::-webkit-scrollbar {
          display: none;
        }
        .tabs-container {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
      `}</style>
      <div style={containerStyles} className="tabs-container">
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
    </>
  )
}

export default Tabs
