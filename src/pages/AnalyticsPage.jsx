import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, Spinner, EmptyState, Badge, PageHeader, ResponsiveTabs } from '../components/ui'
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
  useEffect(() => {
    if (session) {
      loadRestaurant()
    }
  }, [session])

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

      // checkPremiumAccess vuole il ristorante e restituisce un oggetto: serve hasValidAccess
      setHasPremium(checkPremiumAccess(data).hasValidAccess)
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

  const tabsData = [
    { label: 'Panoramica', value: 'overview' },
    { label: 'Vendite', value: 'sales' },
    { label: 'Prodotti', value: 'products' },
    { label: 'Conversione', value: 'conversion' },
    { label: 'Staff e servizio', value: 'staff' },
  ]

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
      description: 'Quanti clienti vedono, aprono, aggiungono al carrello e ordinano ogni prodotto',
      path: '/analytics/conversion-funnel',
      premium: true,
      category: 'conversion',
    },
    {
      title: 'Staff e Servizio',
      description: 'Chi prende, approva, prepara e chiude gli ordini, da dove arrivano e quanto tempo servono',
      path: '/analytics/staff-performance',
      premium: true,
      category: 'staff',
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
        permissions={['*']}
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
      permissions={['*']}
      onLogout={handleLogout}
    >
      {/* Page Header */}
      <PageHeader title="Analytics" subtitle="Monitora le performance del tuo ristorante" />

      <ResponsiveTabs tabs={tabsData} activeTab={activeTab} onChange={setActiveTab} />

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
                  navigate('/impostazioni?tab=subscription')
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
                  <Button variant="primary" size="sm" onClick={() => navigate('/impostazioni?tab=subscription')}>
                    Vedi abbonamento
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
