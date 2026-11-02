import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Spinner, PageHeader, ResponsiveTabs } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import ProductManager from '../components/ProductManager'
import CategoryManager from '../components/CategoryManager'

/**
 * Prodotti (TEST): STESSE funzioni della pagina Prodotti (Prodotti + Categorie),
 * ma con gli elementi mostrati a RIGHE (stile e-commerce) e un menu azioni "⋮"
 * per riga. Riusa ProductManager e CategoryManager con layout="rows".
 */
function ProductsTestPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')

  useEffect(() => { if (session) loadRestaurant() }, [session])

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('restaurants').select('*').eq('user_id', session.user.id).single()
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
      localStorage.clear(); sessionStorage.clear()
      window.location.href = '/#/'; window.location.reload()
    } catch (error) { console.error('Errore logout:', error) }
  }

  const isPremium = restaurant?.subscription_tier === 'premium'
  const tabsData = [
    { label: 'Tutti i Prodotti', value: 'products' },
    { label: 'Categorie', value: 'categories' },
  ]

  const layoutProps = {
    restaurantName: restaurant?.name,
    userName: session?.user?.email,
    isPremium,
    permissions: ['*'],
    onLogout: handleLogout,
  }

  if (loading) {
    return <DashboardLayout {...layoutProps}><Spinner size="lg" text="Caricamento..." centered /></DashboardLayout>
  }

  return (
    <DashboardLayout {...layoutProps}>
      <PageHeader title="Prodotti (test)" subtitle="Stesse funzioni della pagina Prodotti, ma con prodotti e categorie a righe." />
      <ResponsiveTabs tabs={tabsData} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'products' && (
        <ProductManager restaurantId={restaurant?.id} restaurant={restaurant} layout="rows" />
      )}
      {activeTab === 'categories' && (
        <CategoryManager restaurantId={restaurant?.id} restaurant={restaurant} layout="rows" />
      )}
    </DashboardLayout>
  )
}

export default ProductsTestPage
