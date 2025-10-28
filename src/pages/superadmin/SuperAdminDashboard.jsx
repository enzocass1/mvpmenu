/**
 * Super Admin Dashboard
 *
 * Dashboard principale per Super Admin con:
 * - KPI cards (MRR, Active Subscriptions, Churn Rate)
 * - Plans distribution
 * - Quick actions
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Alert, KPICard, Spinner } from '../../components/ui'
import SuperAdminLayout from '../../components/ui/SuperAdminLayout'
import { tokens } from '../../styles/tokens'
import plansService from '../../services/plansService.js'
import subscriptionManagementService from '../../services/subscriptionManagementService'

function SuperAdminDashboard() {
  const navigate = useNavigate()

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [planStats, setPlanStats] = useState([])
  const [isExpiring, setIsExpiring] = useState(false)

  /**
   * Load dashboard data
   */
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load all data in parallel
      const [statsResult, plansResult] = await Promise.all([
        plansService.getPlansStatistics(),
        plansService.getAllPlans(true), // Include hidden plans
      ])

      if (statsResult.error) throw new Error(statsResult.error.message)
      if (plansResult.error) throw new Error(plansResult.error.message)

      // Calculate aggregate stats
      const totalActive = statsResult.data.reduce((sum, s) => sum + s.active, 0)
      const totalMRR = statsResult.data.reduce((sum, s) => {
        const plan = plansResult.data.find(p => p.name === s.plan_name)
        return sum + (plan?.price_monthly || 0) * s.active
      }, 0)

      setStats({
        totalActive,
        totalMRR,
        totalRestaurants: statsResult.data.reduce((sum, s) => sum + s.total, 0),
        churnRate: 0, // TODO: Calculate from subscription_events
      })

      setPlanStats(statsResult.data)
    } catch (err) {
      console.error('❌ Error loading dashboard:', err)
      setError(err.message || 'Errore nel caricamento della dashboard')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Manually trigger expiration of trials and temporary upgrades
   */
  const handleManualExpiration = async () => {
    if (!confirm('⏰ Eseguire scadenza manuale di trial periods e upgrade temporanei?\n\nQuesta operazione:\n- Scade i trial periods scaduti\n- Scade gli upgrade temporanei scaduti\n- Ripristina i piani originali')) {
      return
    }

    setIsExpiring(true)
    try {
      const result = await subscriptionManagementService.manuallyExpireSubscriptions()

      if (!result.success) {
        throw new Error(result.error || 'Errore sconosciuto')
      }

      const { trial_periods, temporary_upgrades } = result.data

      alert(
        `✅ Scadenza completata con successo!\n\n` +
        `🔍 Trial Periods:\n` +
        `   - Scaduti: ${trial_periods?.expired_count || 0}\n\n` +
        `🚀 Upgrade Temporanei:\n` +
        `   - Scaduti: ${temporary_upgrades?.expired_count || 0}\n` +
        `   - Piani ripristinati: ${temporary_upgrades?.expired_count || 0}`
      )

      // Ricarica i dati della dashboard
      loadDashboardData()
    } catch (error) {
      console.error('❌ Error during manual expiration:', error)
      alert('❌ Errore durante la scadenza manuale:\n\n' + error.message)
    } finally {
      setIsExpiring(false)
    }
  }

  // Styles
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

  const sectionTitleStyles = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.lg,
  }

  const quickActionsStyles = {
    display: 'flex',
    gap: tokens.spacing.md,
    flexWrap: 'wrap',
    marginBottom: tokens.spacing['2xl'],
  }

  const tableHeaderStyles = {
    textAlign: 'left',
    padding: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.gray[600],
    textTransform: 'uppercase',
  }

  const tableCellStyles = {
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.sm,
  }

  if (loading) {
    return (
      <SuperAdminLayout>
        <Spinner size="lg" text="Caricamento dashboard..." centered />
      </SuperAdminLayout>
    )
  }

  if (error) {
    return (
      <SuperAdminLayout>
        <Alert variant="error">{error}</Alert>
        <Button onClick={loadDashboardData} style={{ marginTop: '16px' }}>
          Riprova
        </Button>
      </SuperAdminLayout>
    )
  }

  return (
    <SuperAdminLayout>
      {/* Page Header */}
      <div style={pageHeaderStyles}>
        <h1 style={titleStyles}>Dashboard</h1>
        <p style={subtitleStyles}>
          Sistema di Gestione MVP Menu
        </p>
      </div>

      {/* KPI Cards */}
      <div style={gridStyles}>
        <KPICard
          title="MRR Totale"
          value={`€${stats.totalMRR.toFixed(2)}`}
          subtitle={`ARR: €${(stats.totalMRR * 12).toFixed(2)}`}
          trendDirection="neutral"
        />
        <KPICard
          title="Abbonamenti Attivi"
          value={stats.totalActive.toString()}
          subtitle={`su ${stats.totalRestaurants} totali`}
          trend={stats.totalActive > 0 ? `${((stats.totalActive / stats.totalRestaurants) * 100).toFixed(0)}%` : null}
          trendDirection={stats.totalActive > 0 ? 'up' : 'neutral'}
        />
        <KPICard
          title="Churn Rate"
          value={`${stats.churnRate}%`}
          subtitle="Ultimi 30 giorni"
          trendDirection="neutral"
        />
        <KPICard
          title="Nuovi Questo Mese"
          value="0"
          subtitle="TODO: Calcolare"
          trendDirection="neutral"
        />
      </div>

      {/* Quick Actions */}
      <h2 style={sectionTitleStyles}>Azioni Rapide</h2>
      <div style={quickActionsStyles}>
        <Button variant="primary" onClick={() => navigate('/super-admin/plans')}>
          Gestisci Piani
        </Button>
        <Button variant="secondary" onClick={() => navigate('/super-admin/restaurants')}>
          CRM Ristoranti
        </Button>
        <Button variant="outline" onClick={() => navigate('/super-admin/analytics')}>
          Analytics
        </Button>
        <Button
          variant="outline"
          onClick={handleManualExpiration}
          disabled={isExpiring}
          style={{
            color: tokens.colors.warning.base,
            borderColor: tokens.colors.warning.light,
          }}
        >
          {isExpiring ? '⏳ Esecuzione...' : '⏰ Esegui Scadenze'}
        </Button>
      </div>

      {/* Plans Distribution */}
      <h2 style={sectionTitleStyles}>Distribuzione Piani</h2>
      <Card>
        <div style={{ overflowX: 'auto', padding: tokens.spacing.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.colors.gray[200]}` }}>
                <th style={tableHeaderStyles}>Piano</th>
                <th style={tableHeaderStyles}>Attivi</th>
                <th style={tableHeaderStyles}>Totali</th>
                <th style={tableHeaderStyles}>MRR</th>
              </tr>
            </thead>
            <tbody>
              {planStats.map((stat, idx) => {
                const mrr = stat.active * (stat.price_monthly || 0)
                return (
                  <tr key={idx} style={{ borderBottom: `1px solid ${tokens.colors.gray[100]}` }}>
                    <td style={tableCellStyles}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                        {stat.plan_name || 'N/A'}
                        {stat.plan_name?.includes('Legacy') && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            backgroundColor: '#ffd700',
                            color: '#000',
                            borderRadius: '12px',
                            fontWeight: '600'
                          }}>
                            Legacy
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={tableCellStyles}>{stat.active}</td>
                    <td style={tableCellStyles}>{stat.total}</td>
                    <td style={tableCellStyles}>€{mrr.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </SuperAdminLayout>
  )
}

export default SuperAdminDashboard
