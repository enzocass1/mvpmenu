import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { tokens } from '../../styles/tokens'
import Badge from './Badge'

/**
 * Sidebar Navigation Component - Shopify-like Design System
 * NO icons - text only navigation
 * Responsive: collapsible on mobile
 */
function Sidebar({ isOpen, onClose, restaurantName, userName, isPremium }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navigationItems = [
    {
      label: 'Home',
      path: '/dashboard',
      section: 'main',
    },
    {
      label: 'Cassa',
      path: '/cassa',
      section: 'main',
      badge: 'Nuova',
    },
    {
      label: 'Ordini',
      path: '/ordini',
      section: 'main',
    },
    {
      label: 'Prodotti',
      path: '/prodotti',
      section: 'main',
    },
    {
      label: 'Analytics',
      path: '/analytics',
      section: 'main',
    },
    {
      label: 'Canali di Vendita',
      path: '/canali',
      section: 'main',
    },
    {
      label: 'Impostazioni',
      path: '/impostazioni',
      section: 'main',
    },
    {
      label: 'Piano',
      path: '/piano',
      section: 'bottom',
      badge: isPremium ? 'Premium' : 'Free',
    },
  ]

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const handleNavigation = (path) => {
    navigate(path)
    if (window.innerWidth < 1024) {
      onClose?.()
    }
  }

  // Styles
  const isMobile = window.innerWidth < 1024

  const sidebarStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: isMobile ? '100%' : '240px',
    backgroundColor: tokens.colors.white,
    borderRight: isMobile ? 'none' : `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
    display: 'flex',
    flexDirection: 'column',
    zIndex: tokens.zIndex.modal,
    transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
    transition: tokens.transitions.base,
  }

  const closeButtonStyles = {
    position: 'absolute',
    top: tokens.spacing.md,
    right: tokens.spacing.md,
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: tokens.colors.gray[600],
    padding: tokens.spacing.xs,
    lineHeight: 1,
    display: isMobile ? 'block' : 'none',
  }

  const headerStyles = {
    padding: tokens.spacing.lg,
    borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
  }

  const restaurantNameStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  const userNameStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[600],
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  const navStyles = {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.spacing.md,
    display: 'flex',
    flexDirection: 'column',
  }

  const sectionStyles = {
    flex: 1,
  }

  const separatorStyles = {
    height: '1px',
    backgroundColor: tokens.colors.gray[200],
    margin: `${tokens.spacing.md} 0`,
  }

  const navItemStyles = (active) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    marginBottom: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.md,
    backgroundColor: active ? tokens.colors.gray[100] : 'transparent',
    color: active ? tokens.colors.black : tokens.colors.gray[700],
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: active ? tokens.typography.fontWeight.semibold : tokens.typography.fontWeight.medium,
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    transition: tokens.transitions.base,
    fontFamily: tokens.typography.fontFamily.base,
  })

  const [hoveredItem, setHoveredItem] = React.useState(null)

  return (
    <>
      {/* Sidebar */}
      <aside style={sidebarStyles}>
        {/* Close button (mobile only) */}
        <button style={closeButtonStyles} onClick={onClose}>
          ×
        </button>

        {/* Header */}
        <div style={headerStyles}>
          <h2 style={restaurantNameStyles}>{restaurantName || 'MVP Menu'}</h2>
          <p style={userNameStyles}>{userName || 'Utente'}</p>
        </div>

        {/* Navigation */}
        <nav style={navStyles}>
          {/* Main section */}
          <div style={sectionStyles}>
            {navigationItems
              .filter((item) => item.section === 'main')
              .map((item) => {
                const active = isActive(item.path)
                const hovered = hoveredItem === item.path

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{
                      ...navItemStyles(active),
                      ...(hovered && !active && {
                        backgroundColor: tokens.colors.gray[50],
                      }),
                    }}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge variant="info" size="sm">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                )
              })}
          </div>

          {/* Separator */}
          <div style={separatorStyles} />

          {/* Bottom section */}
          <div>
            {navigationItems
              .filter((item) => item.section === 'bottom')
              .map((item) => {
                const active = isActive(item.path)
                const hovered = hoveredItem === item.path

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{
                      ...navItemStyles(active),
                      ...(hovered && !active && {
                        backgroundColor: tokens.colors.gray[50],
                      }),
                    }}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant={isPremium ? 'premium' : 'default'}
                        size="sm"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                )
              })}
          </div>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
