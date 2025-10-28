import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { tokens } from '../../styles/tokens'
import Badge from './Badge'
import Button from './Button'

/**
 * SuperAdminLayout - Layout per pagine Super Admin
 * Stile identico al DashboardLayout ma con menu dedicato
 */
function SuperAdminLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [hoveredItem, setHoveredItem] = useState(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/super-admin/dashboard',
      section: 'main',
    },
    {
      label: 'Gestisci Piani',
      path: '/super-admin/plans',
      section: 'main',
    },
    {
      label: 'CRM Ristoranti',
      path: '/super-admin/restaurants',
      section: 'main',
    },
    {
      label: 'Analytics',
      path: '/super-admin/analytics',
      section: 'main',
      badge: 'Presto',
    },
  ]

  const isActive = (path) => {
    return location.pathname === path
  }

  const handleNavigation = (path) => {
    navigate(path)
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const handleLogout = () => {
    if (window.confirm('Sei sicuro di voler uscire?')) {
      // Clear super admin session
      localStorage.removeItem('superAdminSession')
      sessionStorage.clear()
      navigate('/super-admin/login')
    }
  }

  // Styles
  const containerStyles = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: tokens.colors.gray[50],
  }

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
    transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
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

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
  }

  const subtitleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[600],
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

  const mainStyles = {
    flex: 1,
    marginLeft: isDesktop ? '240px' : '0',
    transition: tokens.transitions.base,
    display: 'flex',
    flexDirection: 'column',
  }

  const topBarStyles = {
    display: isDesktop ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.white,
    borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
    position: 'sticky',
    top: 0,
    zIndex: tokens.zIndex.sticky,
  }

  const topBarTitleStyles = {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    margin: 0,
    flex: 1,
    textAlign: 'center',
  }

  const contentStyles = {
    flex: 1,
    padding: isMobile ? tokens.spacing.md : tokens.spacing.xl,
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  }

  return (
    <div style={containerStyles}>
      {/* Sidebar */}
      <aside style={sidebarStyles}>
        {/* Close button (mobile only) */}
        <button style={closeButtonStyles} onClick={() => setSidebarOpen(false)}>
          ×
        </button>

        {/* Header */}
        <div style={headerStyles}>
          <h2 style={titleStyles}>Super Admin</h2>
          <p style={subtitleStyles}>MVP Menu</p>
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

          {/* Logout button */}
          <div>
            <button
              onClick={handleLogout}
              onMouseEnter={() => setHoveredItem('logout')}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                ...navItemStyles(false),
                color: tokens.colors.error.base,
                ...(hoveredItem === 'logout' && {
                  backgroundColor: tokens.colors.error.light,
                }),
              }}
            >
              <span>Esci</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={mainStyles}>
        {/* Mobile Top Bar */}
        <div style={topBarStyles}>
          <div style={{ flexShrink: 0 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              Menu
            </Button>
          </div>
          <h1 style={topBarTitleStyles}>Super Admin</h1>
          <div style={{ flexShrink: 0 }}>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Esci
            </Button>
          </div>
        </div>

        {/* Page Content */}
        <div style={contentStyles}>{children}</div>
      </main>
    </div>
  )
}

export default SuperAdminLayout
