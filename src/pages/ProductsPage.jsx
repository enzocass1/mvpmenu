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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
    marginBottom: isMobile ? tokens.spacing.lg : tokens.spacing.xl,
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
    fontSize: isMobile ? tokens.typography.fontSize.sm : tokens.typography.fontSize.base,
    color: tokens.colors.gray[600],
  }

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
