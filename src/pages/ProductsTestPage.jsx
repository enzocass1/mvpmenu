import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Spinner, ResponsiveTabs } from '../components/ui'
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
  const [counts, setCounts] = useState({ products: 0, categories: 0 })

  useEffect(() => { if (session) loadRestaurant() }, [session])

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('restaurants').select('*').eq('user_id', session.user.id).single()
      if (error) throw error
      setRestaurant(data)
      // Conteggi per il titolo (numero davanti al nome)
      const { data: cats } = await supabase.from('categories').select('id').eq('restaurant_id', data.id)
      const catIds = (cats || []).map(c => c.id)
      let prodCount = 0
      if (catIds.length) {
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).in('category_id', catIds)
        prodCount = count || 0
      }
      setCounts({ products: prodCount, categories: (cats || []).length })
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
    { label: `${counts.products} Prodotti`, value: 'products' },
    { label: `${counts.categories} Categorie`, value: 'categories' },
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
