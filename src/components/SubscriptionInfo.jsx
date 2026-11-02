import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { getSubscriptionState, formatDateIt, GRACE_DAYS } from '../lib/subscriptionStatus'
import { NOTICE_DAYS } from './SubscriptionBanner'

/**
 * Impostazioni → Abbonamento (lato ristoratore, sola lettura).
 * Mostra la scadenza, lo stato (attivo / in tolleranza / bloccato)
 * e lo storico dei pagamenti registrati. Il rinnovo avviene via bonifico.
 */
function SubscriptionInfo({ restaurant }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurant?.id) return
    let active = true
    ;(async () => {
      try {
        const { data } = await supabase
          .from('subscription_payments')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('paid_at', { ascending: false })
          .limit(24)
        if (active) setPayments(data || [])
      } catch { /* storico non disponibile */ } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [restaurant?.id])

  const sub = getSubscriptionState(restaurant)
  const isTrial = restaurant?.subscription_status === 'trialing'

  const STATE_UI = {
    none: { label: 'Attivo', color: '#1b5e20', bg: '#e8f5e9', border: '#c8e6c9',
      text: 'Nessuna scadenza impostata al momento.' },
    active: { label: isTrial ? 'Prova gratuita' : 'Attivo', color: '#1b5e20', bg: '#e8f5e9', border: '#c8e6c9',
      text: `${isTrial ? 'La tua prova gratuita è attiva' : 'Il tuo abbonamento è attivo'} fino al ${formatDateIt(sub.expiresAt)}${sub.daysLeft != null ? ` (${sub.daysLeft} giorni rimanenti)` : ''}.` },
    grace: { label: 'Scaduto — periodo di tolleranza', color: '#8a6d00', bg: '#fff8e1', border: '#ffecb3',
      text: `L'abbonamento è scaduto il ${formatDateIt(sub.expiresAt)}. L'app resta attiva ancora ${sub.graceDaysLeft} giorni, poi l'accesso verrà sospeso. Rinnova con un bonifico per continuare senza interruzioni.` },
    blocked: { label: 'Sospeso', color: '#b71c1c', bg: '#ffebee', border: '#ffcdd2',
      text: `L'abbonamento è scaduto il ${formatDateIt(sub.expiresAt)} e sono passati più di ${GRACE_DAYS} giorni: l'accesso alle funzioni e il menu online sono sospesi. Rinnova con un bonifico per riattivare subito tutto.` },
  }
  const ui = STATE_UI[sub.state]

  const card = {
    background: tokens.colors.white,
    border: `1px solid ${tokens.colors.gray[200]}`,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  }

  return (
    <div>
      {/* Stato */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: tokens.colors.black }}>Stato abbonamento</h3>
          <span style={{
            padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
            color: ui.color, background: ui.bg, border: `1px solid ${ui.border}`,
          }}>
            {ui.label}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: tokens.colors.gray[700], lineHeight: 1.55 }}>{ui.text}</p>
      </div>

      {/* Come si rinnova */}
      <div style={card}>
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: tokens.colors.black }}>Come si rinnova</h3>
        <p style={{ margin: 0, fontSize: '14px', color: tokens.colors.gray[700], lineHeight: 1.55 }}>
          Il rinnovo si paga con <strong>bonifico bancario</strong> o in <strong>contanti</strong>: scegli tu quanti mesi coprire.
          Appena il pagamento viene registrato, la nuova scadenza compare qui.
          {' '}Riceverai un avviso nell'app <strong>{NOTICE_DAYS} giorni prima della scadenza</strong>.
          {' '}Per coordinate e importi scrivici dalla sezione <a href="/#/assistenza" style={{ color: tokens.colors.black, fontWeight: 600 }}>Assistenza</a>.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: '13px', color: tokens.colors.gray[500], lineHeight: 1.55 }}>
          Se l'abbonamento non viene rinnovato, l'app resta attiva per altri {GRACE_DAYS} giorni; poi l'accesso è
          limitato alle sole Impostazioni e il menu online viene sospeso, finché non rinnovi.
          {' '}Dettagli nelle <a href="/#/termini" target="_blank" rel="noopener noreferrer" style={{ color: tokens.colors.black }}>Condizioni generali di vendita</a>.
        </p>
      </div>

      {/* Storico pagamenti */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: tokens.colors.black }}>Storico pagamenti</h3>
        {loading ? (
          <p style={{ margin: 0, fontSize: '13px', color: tokens.colors.gray[500] }}>Caricamento…</p>
        ) : payments.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: tokens.colors.gray[500] }}>Nessun pagamento registrato.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Data', 'Importo', 'Mesi', 'Nuova scadenza'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${tokens.colors.gray[200]}`, color: tokens.colors.gray[600], fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${tokens.colors.gray[100]}` }}>{formatDateIt(p.paid_at)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${tokens.colors.gray[100]}`, fontWeight: 600 }}>{Number(p.amount).toFixed(2).replace('.', ',')} €</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${tokens.colors.gray[100]}` }}>{p.months}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${tokens.colors.gray[100]}` }}>{formatDateIt(p.new_expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubscriptionInfo
