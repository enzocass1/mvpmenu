import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, Badge, Spinner } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import { getPlanInfo, getSubscriptionHealth } from '../utils/subscription'

/**
 * Plan Page - Shopify-like Design System
 * Free vs Premium comparison and subscription management
 */
function PlanPage({ session }) {
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [planInfo, setPlanInfo] = useState(null)

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      setRestaurant(data)

      const info = getPlanInfo(data.subscription_tier)
      setPlanInfo(info)
    } catch (error) {
      console.error('Errore caricamento:', error)
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

  const handleUpgrade = () => {
    navigate('/checkout')
  }

  const handleManageSubscription = async () => {
    // Implement Stripe customer portal redirect
    alert('Gestione abbonamento - Coming soon')
  }

  const isPremium = restaurant?.subscription_tier === 'premium'

  const pageHeaderStyles = {
    marginBottom: tokens.spacing.xl,
  }

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.sm,
  }

  const subtitleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.gray[600],
  }

  const gridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: tokens.spacing.xl,
    marginBottom: tokens.spacing.xl,
  }

  const planCardStyles = (isCurrentPlan) => ({
    border: isCurrentPlan
      ? `2px solid ${tokens.colors.black}`
      : `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
  })

  const planTitleStyles = {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.sm,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  }

  const priceStyles = {
    fontSize: tokens.typography.fontSize['4xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
  }

  const periodStyles = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[600],
    marginBottom: tokens.spacing.xl,
  }

  const featureListStyles = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    marginBottom: tokens.spacing.xl,
  }

  const featureItemStyles = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.gray[700],
    marginBottom: tokens.spacing.sm,
    paddingLeft: tokens.spacing.md,
    position: 'relative',
  }

  const features = {
    free: [
      'Menu digitale online',
      'QR Code personalizzato',
      'Ordini al tavolo base',
      'Gestione categorie e prodotti',
      'Analytics base',
    ],
    premium: [
      'Tutto del piano Free',
      'Ordini prioritari',
      'Analytics avanzate',
      'Export dati e backup',
      'Sistema fiscale completo',
      'Gestione staff',
      'Personalizzazione temi',
      'Supporto prioritario',
    ],
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
      <div style={pageHeaderStyles}>
        <h1 style={titleStyles}>Piano</h1>
        <p style={subtitleStyles}>
          Scegli il piano più adatto al tuo ristorante
        </p>
      </div>

      {/* Plans Comparison */}
      <div style={gridStyles}>
        {/* Free Plan */}
        <Card
          variant="outlined"
          padding="xl"
          style={planCardStyles(!isPremium)}
        >
          <div style={planTitleStyles}>
            <span>Free</span>
            {!isPremium && <Badge variant="default">Piano Attuale</Badge>}
          </div>
          <div style={priceStyles}>€0</div>
          <div style={periodStyles}>al mese</div>
          <ul style={featureListStyles}>
            {features.free.map((feature, index) => (
              <li key={index} style={featureItemStyles}>
                {feature}
              </li>
            ))}
          </ul>
          {isPremium && (
            <Button variant="outline" fullWidth disabled>
              Piano Attuale: Premium
            </Button>
          )}
        </Card>

        {/* Premium Plan */}
        <Card
          variant="elevated"
          padding="xl"
          style={planCardStyles(isPremium)}
        >
          <div style={planTitleStyles}>
            <span>Premium</span>
            {isPremium && <Badge variant="premium">Piano Attuale</Badge>}
          </div>
          <div style={priceStyles}>€29</div>
          <div style={periodStyles}>al mese</div>
          <ul style={featureListStyles}>
            {features.premium.map((feature, index) => (
              <li key={index} style={featureItemStyles}>
                {feature}
              </li>
            ))}
          </ul>
          {isPremium ? (
            <Button variant="outline" fullWidth onClick={handleManageSubscription}>
              Gestisci Abbonamento
            </Button>
          ) : (
            <Button variant="primary" fullWidth onClick={handleUpgrade}>
              Passa a Premium
            </Button>
          )}
        </Card>
      </div>

      {/* Current Plan Info */}
      {planInfo && (
        <Card padding="lg">
          <h3
            style={{
              margin: 0,
              fontSize: tokens.typography.fontSize.xl,
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.black,
              marginBottom: tokens.spacing.md,
            }}
          >
            Informazioni Piano Attuale
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
              fontSize: tokens.typography.fontSize.sm,
            }}
          >
            <div style={{ color: tokens.colors.gray[600] }}>Piano:</div>
            <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
              {planInfo.name}
            </div>
            <div style={{ color: tokens.colors.gray[600] }}>Stato:</div>
            <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
              {restaurant.subscription_status === 'active' ? 'Attivo' : 'Inattivo'}
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  )
}

export default PlanPage
