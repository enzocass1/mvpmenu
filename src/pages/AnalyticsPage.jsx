import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Tabs, Card, Button, Spinner, EmptyState, Badge } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import { checkPremiumAccess } from '../utils/subscription'

/**
 * Analytics Page - Shopify-like Design System
 * Unified analytics dashboard with tabs
 */
function AnalyticsPage({ session }) {
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [hasPremium, setHasPremium] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    if (session) {
      loadRestaurant()
    }
  }, [session])

  // Desktop/mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      setRestaurant(data)

      const premium = await checkPremiumAccess(data.id)
      setHasPremium(premium)
    } catch (error) {
      console.error('Errore caricamento ristorante:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/#/'
      window.location.reload()
    } catch (error) {
      console.error('Errore logout:', error)
    }
  }

  const isPremium = restaurant?.subscription_tier === 'premium'

  const pageHeaderStyles = {
    marginBottom: tokens.spacing.xl,
  }

  const titleStyles = {
    margin: 0,
    fontSize: isMobile ? tokens.typography.fontSize['2xl'] : tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.sm,
  }

  const subtitleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.gray[600],
  }

  const tabsData = [
    { label: 'Panoramica', value: 'overview' },
    { label: 'Vendite', value: 'sales' },
    { label: 'Prodotti', value: 'products' },
    { label: 'Conversione', value: 'conversion' },
  ]

  const dropdownStyles = {
    width: '100%',
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.black,
    backgroundColor: tokens.colors.white,
    border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.md,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '40px',
  }

  const analyticsOptions = [
    {
      title: 'Revenue Analytics',
      description: 'Analisi dettagliata del fatturato e delle vendite',
      path: '/analytics/revenue-analytics',
      premium: false,
      category: 'sales',
    },
    {
      title: 'AOV Analysis',
      description: 'Analisi del valore medio degli ordini',
      path: '/analytics/aov-analysis',
      premium: true,
      category: 'sales',
    },
    {
      title: 'Time Based Analysis',
      description: 'Analisi temporale delle vendite',
      path: '/analytics/time-based-analysis',
      premium: true,
      category: 'sales',
    },
    {
      title: 'Top Products',
      description: 'Prodotti più venduti e performance',
      path: '/analytics/top-products-ordered',
      premium: false,
      category: 'products',
    },
    {
      title: 'Conversion Funnel',
      description: 'Analisi del funnel di conversione',
      path: '/analytics/conversion-funnel',
      premium: true,
      category: 'conversion',
    },
  ]

  const getFilteredOptions = () => {
    if (activeTab === 'overview') return analyticsOptions
    return analyticsOptions.filter((opt) => opt.category === activeTab)
  }

  const cardStyles = {
    marginBottom: tokens.spacing.md,
    cursor: 'pointer',
  }

  const cardTitleStyles = {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  }

  const cardDescStyles = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[600],
    lineHeight: tokens.typography.lineHeight.relaxed,
  }

  if (loading) {
    return (
      <DashboardLayout
        restaurantName={restaurant?.name}
        userName={session?.user?.email}
        isPremium={isPremium}
        onLogout={handleLogout}
      >
        <Spinner size="lg" text="Caricamento..." centered />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      restaurantName={restaurant?.name}
      userName={session?.user?.email}
      isPremium={isPremium}
      onLogout={handleLogout}
    >
      {/* Page Header */}
      <div style={pageHeaderStyles}>
        <h1 style={titleStyles}>Analytics</h1>
        <p style={subtitleStyles}>
          Monitora le performance del tuo ristorante
        </p>
      </div>

      {/* Tabs / Dropdown */}
      <div style={{ marginBottom: isMobile ? tokens.spacing.lg : tokens.spacing.xl }}>
        {isMobile ? (
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            style={dropdownStyles}
          >
            {tabsData.map(tab => (
              <option key={tab.value} value={tab.value}>
                {tab.label}
              </option>
            ))}
          </select>
        ) : (
          <Tabs tabs={tabsData} activeTab={activeTab} onChange={setActiveTab} />
        )}
      </div>

      {/* Analytics Options */}
      <div>
        {getFilteredOptions().length === 0 ? (
          <Card>
            <EmptyState
              title="Nessuna analisi disponibile"
              description="Non ci sono analytics disponibili per questa categoria."
              centered={false}
            />
          </Card>
        ) : (
          getFilteredOptions().map((option) => (
            <Card
              key={option.path}
              variant="default"
              padding="lg"
              hoverable={!option.premium || hasPremium}
              onClick={() => {
                if (option.premium && !hasPremium) {
                  navigate('/piano')
                } else {
                  navigate(option.path)
                }
              }}
              style={cardStyles}
            >
              <div style={cardTitleStyles}>
                <span>{option.title}</span>
                {option.premium && <Badge variant="premium" size="sm">Premium</Badge>}
              </div>
              <p style={cardDescStyles}>{option.description}</p>
              {option.premium && !hasPremium && (
                <div style={{ marginTop: tokens.spacing.md }}>
                  <Button variant="primary" size="sm" onClick={() => navigate('/piano')}>
                    Passa a Premium
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}

export default AnalyticsPage
