import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Tabs, Spinner } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import RestaurantForm from '../components/RestaurantForm'
import ThemeCustomizer from '../components/ThemeCustomizer'
import OrderSettings from '../components/OrderSettings'
import OpeningHoursManager from '../components/OpeningHoursManager'
import FiscalSettings from './FiscalSettings'

/**
 * Settings Page - Shopify-like Design System
 * Tabs: Generale | Temi e Stile | Ordini al Tavolo | Orari | Fiscale
 */
function SettingsPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')

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

  const handleRestaurantUpdate = () => {
    loadRestaurant()
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

  const tabsData = [
    { label: 'Generale', value: 'general' },
    { label: 'Temi e Stile', value: 'themes' },
    { label: 'Ordini al Tavolo', value: 'orders' },
    { label: 'Orari', value: 'hours' },
    { label: 'Fiscale', value: 'fiscal' },
  ]

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
        <h1 style={titleStyles}>Impostazioni</h1>
        <p style={subtitleStyles}>
          Configura il tuo ristorante e personalizza l'esperienza
        </p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: tokens.spacing.xl }}>
        <Tabs tabs={tabsData} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div>
          <RestaurantForm
            userId={session.user.id}
            onSave={handleRestaurantUpdate}
          />
        </div>
      )}

      {activeTab === 'themes' && (
        <div>
          <ThemeCustomizer restaurantId={restaurant?.id} />
        </div>
      )}

      {activeTab === 'orders' && (
        <div>
          <OrderSettings restaurantId={restaurant?.id} />
        </div>
      )}

      {activeTab === 'hours' && (
        <div>
          <OpeningHoursManager restaurantId={restaurant?.id} />
        </div>
      )}

      {activeTab === 'fiscal' && (
        <div>
          <FiscalSettings session={session} />
        </div>
      )}
    </DashboardLayout>
  )
}

export default SettingsPage
