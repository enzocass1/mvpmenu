import React, { useState } from 'react'
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
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const containerStyles = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: tokens.colors.gray[50],
  }

  const mainStyles = {
    flex: 1,
    marginLeft: window.innerWidth >= 1024 ? '240px' : '0',
    transition: tokens.transitions.base,
    display: 'flex',
    flexDirection: 'column',
  }

  const topBarStyles = {
    display: window.innerWidth < 1024 ? 'flex' : 'none',
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
  }

  const contentStyles = {
    flex: 1,
    padding: tokens.spacing.xl,
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
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
      />

      {/* Main Content */}
      <main style={mainStyles}>
        {/* Mobile Top Bar */}
        <div style={topBarStyles}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            Menu
          </Button>
          <h1 style={topBarTitleStyles}>{restaurantName || 'MVP Menu'}</h1>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Esci
          </Button>
        </div>

        {/* Page Content */}
        <div style={contentStyles}>{children}</div>
      </main>
    </div>
  )
}

export default DashboardLayout
