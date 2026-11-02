import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Spinner, PageHeader } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import ProductManager from '../components/ProductManager'

/**
 * Prodotti (TEST): STESSA pagina Prodotti e STESSE funzioni, ma i prodotti
 * sono mostrati a RIGHE (stile e-commerce) invece che a griglia.
 * Riusa il componente ProductManager con layout="rows" -> funzionalità identica.
 */
function ProductsTestPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <DashboardLayout restaurantName={restaurant?.name} userName={session?.user?.email} isPremium={isPremium} permissions={['*']} onLogout={handleLogout}>
        <Spinner size="lg" text="Caricamento..." centered />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout restaurantName={restaurant?.name} userName={session?.user?.email} isPremium={isPremium} permissions={['*']} onLogout={handleLogout}>
      <PageHeader title="Prodotti (test)" subtitle="Stesse funzioni della pagina Prodotti, ma con i prodotti a righe." />
      <ProductManager restaurantId={restaurant?.id} restaurant={restaurant} layout="rows" />
    </DashboardLayout>
  )
}

export default ProductsTestPage
