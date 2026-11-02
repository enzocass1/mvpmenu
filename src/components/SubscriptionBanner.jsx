import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getSubscriptionState, formatDateIt, GRACE_DAYS } from '../lib/subscriptionStatus'

// Giorni prima della scadenza in cui avvisare il ristoratore
export const NOTICE_DAYS = 10

/**
 * Avviso abbonamento in cima al gestionale:
 * - ultimi 10 giorni prima della scadenza (o fine prova) -> giallo
 * - scaduto, nei 15 giorni di tolleranza -> rosso
 * - sospeso -> rosso
 * Negli altri casi non mostra nulla.
 */
function SubscriptionBanner() {
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('restaurants')
          .select('subscription_expires_at, subscription_status')
          .eq('user_id', user.id)
          .single()
        if (active) setRestaurant(data)
      } catch { /* nessun avviso */ }
    })()
    return () => { active = false }
  }, [])

  if (!restaurant) return null
  const sub = getSubscriptionState(restaurant)
  const isTrial = restaurant.subscription_status === 'trialing'

  let tone = null
  let text = ''
  if (sub.state === 'active' && sub.daysLeft <= NOTICE_DAYS) {
    tone = 'warn'
    const when = sub.daysLeft <= 1 ? 'domani' : `tra ${sub.daysLeft} giorni`
    text = isTrial
      ? `La prova gratuita termina il ${formatDateIt(sub.expiresAt)} (${when}). Attiva l'abbonamento con bonifico o contanti per continuare.`
      : `Il tuo abbonamento scade il ${formatDateIt(sub.expiresAt)} (${when}). Rinnova con bonifico o contanti per continuare senza interruzioni.`
  } else if (sub.state === 'grace') {
    tone = 'danger'
    text = `Abbonamento scaduto il ${formatDateIt(sub.expiresAt)}: l'app resta attiva ancora ${sub.graceDaysLeft} ${sub.graceDaysLeft === 1 ? 'giorno' : 'giorni'}, poi l'accesso e il menu online verranno sospesi.`
  } else if (sub.state === 'blocked') {
    tone = 'danger'
    text = `Accesso sospeso: l'abbonamento è scaduto da più di ${GRACE_DAYS} giorni. Rinnova per riattivare subito tutte le funzioni e il menu online.`
  }
  if (!tone) return null

  const colors = tone === 'warn'
    ? { bg: '#fff8e1', border: '#ffe08a', text: '#6b4e00' }
    : { bg: '#fdecec', border: '#f5c2c2', text: '#8a1c1c' }

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        padding: '10px 14px',
        marginBottom: 16,
        borderRadius: 10,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: 14,
        lineHeight: 1.45,
      }}
    >
      <span style={{ flex: '1 1 260px' }}>{text}</span>
      <button
        type="button"
        onClick={() => navigate('/impostazioni?tab=subscription')}
        style={{
          padding: '7px 14px',
          borderRadius: 8,
          border: `1px solid ${colors.text}`,
          background: '#ffffff',
          color: colors.text,
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        Vedi abbonamento
      </button>
    </div>
  )
}

export default SubscriptionBanner
