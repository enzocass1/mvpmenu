import React, { useState, useEffect } from 'react'
import { tokens } from '../../styles/tokens'
import Sidebar from './Sidebar'
import Button from './Button'

/**
 * DashboardLayout Component - Shopify-like Design System
 * Wrapper layout with Sidebar for all dashboard pages
 * Responsive with mobile menu toggle
 */
function DashboardLayout({
  children,
  restaurantName,
  userName,
  isPremium = false,
  onLogout,
  permissions = [],
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const containerStyles = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: tokens.colors.gray[50],
  }

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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: `0 ${tokens.spacing.sm}`,
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
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        restaurantName={restaurantName}
        userName={userName}
        isPremium={isPremium}
        permissions={permissions}
        onLogout={onLogout}
      />

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
          <h1 style={topBarTitleStyles}>{restaurantName || 'MVP Menu'}</h1>
          <div style={{ flexShrink: 0 }}>
            <Button variant="ghost" size="sm" onClick={onLogout}>
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

export default DashboardLayout
