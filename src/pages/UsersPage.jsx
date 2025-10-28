/**
 * UsersPage - Gestione Utenti (Ruoli + Membri)
 * Pagina Impostazioni > Utenti con due tab:
 * - Ruoli: Gestione ruoli e permessi
 * - Membri: Gestione membri staff con assegnazione ruoli
 */

import React, { useState } from 'react'
import { tokens } from '../styles/tokens'
import DashboardLayout from '../components/ui/DashboardLayout'
import { Card } from '../components/ui'

// Import tabs (da creare)
import RolesTab from '../components/users/RolesTab'
import MembersTab from '../components/users/MembersTab'

function UsersPage({ session }) {
  const [activeTab, setActiveTab] = useState('roles') // 'roles' | 'members'
  const [restaurant, setRestaurant] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (session) {
      loadRestaurant()
    }
  }, [session])

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      const { supabase } = await import('../supabaseClient')

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      setRestaurant(data)
    } catch (error) {
      console.error('Errore caricamento ristorante:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const { supabase } = await import('../supabaseClient')
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

  if (loading) {
    return (
      <DashboardLayout
        restaurantName={restaurant?.name}
        userName={session?.user?.email}
        isPremium={isPremium}
        permissions={['*']}
        onLogout={handleLogout}
      >
        <div style={{ textAlign: 'center', padding: tokens.spacing.xl }}>
          Caricamento...
        </div>
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
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Gestione Utenti</h1>
        <p style={styles.pageSubtitle}>
          Gestisci ruoli, permessi e membri del tuo staff
        </p>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('roles')}
          style={{
            ...styles.tab,
            ...(activeTab === 'roles' ? styles.tabActive : {})
          }}
        >
          Ruoli
        </button>
        <button
          onClick={() => setActiveTab('members')}
          style={{
            ...styles.tab,
            ...(activeTab === 'members' ? styles.tabActive : {})
          }}
        >
          Membri
        </button>
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'roles' && (
          <RolesTab
            restaurantId={restaurant?.id}
            session={session}
          />
        )}

        {activeTab === 'members' && (
          <MembersTab
            restaurantId={restaurant?.id}
            session={session}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

const styles = {
  pageHeader: {
    marginBottom: tokens.spacing.xl,
  },
  pageTitle: {
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.xs,
  },
  pageSubtitle: {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.gray[600],
  },
  tabsContainer: {
    display: 'flex',
    gap: tokens.spacing.sm,
    borderBottom: `2px solid ${tokens.colors.gray[200]}`,
    marginBottom: tokens.spacing.xl,
  },
  tab: {
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.gray[600],
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '-2px',
  },
  tabActive: {
    color: tokens.colors.black,
    borderBottomColor: tokens.colors.black,
  },
  tabContent: {
    minHeight: '400px',
  },
}

export default UsersPage
