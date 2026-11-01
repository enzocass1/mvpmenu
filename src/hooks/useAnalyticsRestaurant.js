import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

/**
 * Ristorante corrente per le pagine analytics/impostazioni fiscali.
 * Usa quello passato con la navigazione (state) oppure lo carica per
 * l'utente loggato, così le pagine funzionano da qualsiasi punto di ingresso.
 * Restituisce null finché non è disponibile.
 */
export default function useAnalyticsRestaurant() {
  const location = useLocation()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(location.state?.restaurant || null)

  useEffect(() => {
    if (restaurant) return
    let cancelled = false

    const loadRestaurant = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (cancelled) return
      if (error || !data) {
        console.error('Ristorante non trovato per analytics:', error)
        navigate('/dashboard', { replace: true })
        return
      }

      setRestaurant(data)
    }

    loadRestaurant()
    return () => { cancelled = true }
  }, [restaurant, navigate])

  return restaurant
}
