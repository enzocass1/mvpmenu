import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Tabs, Spinner } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import ProductManager from '../components/ProductManager'
import CategoryManager from '../components/CategoryManager'

/**
 * Products Page - Shopify-like Design System
 * Tabs: Tutti i Prodotti | Categorie
 */
function ProductsPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')

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
    { label: 'Tutti i Prodotti', value: 'products' },
    { label: 'Categorie', value: 'categories' },
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
        <h1 style={titleStyles}>Prodotti</h1>
        <p style={subtitleStyles}>
          Gestisci i prodotti del tuo menu e le categorie
        </p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: tokens.spacing.xl }}>
        <Tabs tabs={tabsData} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === 'products' && (
        <div>
          <ProductManager
            restaurantId={restaurant?.id}
            restaurant={restaurant}
          />
        </div>
      )}

      {activeTab === 'categories' && (
        <div>
          <CategoryManager
            restaurantId={restaurant?.id}
            restaurant={restaurant}
          />
        </div>
      )}
    </DashboardLayout>
  )
}

export default ProductsPage
