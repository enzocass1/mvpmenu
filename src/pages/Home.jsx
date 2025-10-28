import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Card, Button, KPICard, EmptyState, Spinner, Alert } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'

/**
 * Home (Overview) Page - Shopify-like Dashboard
 * KPI cards, quick actions, recent activity
 */
function Home({ session }) {
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [temporaryUpgrade, setTemporaryUpgrade] = useState(null)

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (restaurantError) throw restaurantError
      setRestaurant(restaurantData)

      // Check for active temporary upgrade
      const { data: tempUpgradeData, error: tempUpgradeError } = await supabase
        .from('temporary_upgrades')
        .select(`
          *,
          temporary_plan:subscription_plans!temporary_upgrades_temporary_plan_id_fkey(name, slug)
        `)
        .eq('restaurant_id', restaurantData.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!tempUpgradeError && tempUpgradeData) {
        setTemporaryUpgrade(tempUpgradeData)
      }

      // Load today's stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('restaurant_id', restaurantData.id)
        .gte('created_at', today.toISOString())

      if (ordersError) throw ordersError

      // Calculate stats
      const totalOrders = ordersData?.length || 0
      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const pendingOrders = ordersData?.filter(o => o.status === 'pending').length || 0

      setStats({
        totalOrders,
        totalRevenue,
        avgOrderValue,
        pendingOrders,
      })
    } catch (error) {
      console.error('Errore caricamento dati:', error)
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

  /**
   * Calculate days remaining from date
   */
  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0
    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const isPremium = restaurant?.subscription_tier === 'premium'
  const isTrialActive = restaurant?.subscription_status === 'trial'
  const hasTemporaryUpgrade = temporaryUpgrade !== null

  const pageHeaderStyles = {
    marginBottom: tokens.spacing.xl,
  }

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
  }

  const subtitleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.gray[600],
  }

  const gridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: tokens.spacing.lg,
    marginBottom: tokens.spacing['2xl'],
  }

  const quickActionsStyles = {
    display: 'flex',
    gap: tokens.spacing.md,
    flexWrap: 'wrap',
    marginBottom: tokens.spacing['2xl'],
  }

  const sectionTitleStyles = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.lg,
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
        <Spinner size="lg" text="Caricamento dashboard..." centered />
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing.md }}>
          <div>
            <h1 style={titleStyles}>Panoramica</h1>
            <p style={subtitleStyles}>
              Benvenuto in {restaurant?.name || 'MVP Menu'}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} style={{ flexShrink: 0 }}>
            Esci
          </Button>
        </div>
      </div>

      {/* Trial Period Banner */}
      {isTrialActive && (
        <Alert variant="info" style={{ marginBottom: tokens.spacing.lg }}>
          <strong>Periodo di Prova Attivo</strong>
          <p style={{ margin: `${tokens.spacing.xs} 0 0 0` }}>
            Stai utilizzando un periodo di prova. Ti rimangono{' '}
            <strong>{getDaysRemaining(restaurant.subscription_trial_ends_at)} giorni</strong> per
            testare tutte le funzionalità premium. Scadenza:{' '}
            {new Date(restaurant.subscription_trial_ends_at).toLocaleDateString('it-IT')}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/piano')}
            style={{ marginTop: tokens.spacing.sm }}
          >
            Passa a un piano
          </Button>
        </Alert>
      )}

      {/* Temporary Upgrade Banner */}
      {hasTemporaryUpgrade && (
        <Alert variant="success" style={{ marginBottom: tokens.spacing.lg }}>
          <strong>Upgrade Temporaneo Attivo!</strong>
          <p style={{ margin: `${tokens.spacing.xs} 0 0 0` }}>
            Hai accesso temporaneo al piano{' '}
            <strong>{temporaryUpgrade.temporary_plan?.name || 'Premium'}</strong>.{' '}
            Ti rimangono <strong>{getDaysRemaining(temporaryUpgrade.expires_at)} giorni</strong> per
            sfruttare tutte le funzionalità avanzate!
            {temporaryUpgrade.reason && (
              <> Motivo: <em>{temporaryUpgrade.reason}</em></>
            )}
          </p>
          <p style={{
            margin: `${tokens.spacing.xs} 0 0 0`,
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.gray[600]
          }}>
            L'upgrade scade il {new Date(temporaryUpgrade.expires_at).toLocaleDateString('it-IT')}.
            Dopo tornerai automaticamente al tuo piano originale.
          </p>
        </Alert>
      )}

      {/* KPI Cards */}
      <div style={gridStyles}>
        <KPICard
          title="Ordini Oggi"
          value={stats?.totalOrders?.toString() || '0'}
          subtitle="Totale ordini ricevuti"
          trend={stats?.totalOrders > 0 ? '+100%' : null}
          trendDirection={stats?.totalOrders > 0 ? 'up' : 'neutral'}
        />
        <KPICard
          title="Incasso Oggi"
          value={`€${stats?.totalRevenue?.toFixed(2) || '0.00'}`}
          subtitle="Revenue giornaliero"
          trend={stats?.totalRevenue > 0 ? '+100%' : null}
          trendDirection={stats?.totalRevenue > 0 ? 'up' : 'neutral'}
        />
        <KPICard
          title="Valore Medio Ordine"
          value={`€${stats?.avgOrderValue?.toFixed(2) || '0.00'}`}
          subtitle="AOV oggi"
          trendDirection="neutral"
        />
        <KPICard
          title="Ordini in Attesa"
          value={stats?.pendingOrders?.toString() || '0'}
          subtitle="Da confermare"
          trend={stats?.pendingOrders > 0 ? 'Azione richiesta' : null}
          trendDirection={stats?.pendingOrders > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {/* Quick Actions */}
      <h2 style={sectionTitleStyles}>Azioni Rapide</h2>
      <div style={quickActionsStyles}>
        <Button variant="primary" onClick={() => navigate('/cassa')}>
          Apri Cassa
        </Button>
        <Button variant="secondary" onClick={() => navigate('/ordini')}>
          Visualizza Ordini
        </Button>
        <Button variant="outline" onClick={() => navigate('/prodotti')}>
          Gestisci Prodotti
        </Button>
        <Button variant="outline" onClick={() => navigate('/analytics')}>
          Vedi Analytics
        </Button>
      </div>

      {/* Recent Activity or Empty State */}
      <h2 style={sectionTitleStyles}>Attività Recente</h2>
      <Card>
        {stats?.totalOrders === 0 ? (
          <EmptyState
            title="Nessuna attività oggi"
            description="Quando riceverai ordini, appariranno qui con un riepilogo dell'attività recente."
            action={() => navigate('/canali')}
            actionText="Condividi Menu"
            centered={false}
          />
        ) : (
          <div style={{ padding: tokens.spacing.md }}>
            <p style={{ margin: 0, color: tokens.colors.gray[700] }}>
              Hai ricevuto {stats.totalOrders} ordini oggi per un totale di €
              {stats.totalRevenue.toFixed(2)}
            </p>
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}

export default Home
