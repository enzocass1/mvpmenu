import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { tokens } from '../styles/tokens'
import { Spinner, PageHeader } from '../components/ui'
import DashboardLayout from '../components/ui/DashboardLayout'
import { notifyAdmin } from '../lib/adminNotify'
import { formatDateIt } from '../lib/subscriptionStatus'

const TYPES = [
  { value: 'problema', label: 'Segnala un problema', hint: 'Qualcosa non funziona come dovrebbe' },
  { value: 'miglioramento', label: 'Proponi un miglioramento', hint: 'Una funzione nuova o un\'idea per l\'app' },
]
const STATUS_UI = {
  aperto: { label: 'Ricevuta', color: '#6b4e00', bg: '#fff8e1', border: '#ffe08a' },
  in_lavorazione: { label: 'In lavorazione', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  risolto: { label: 'Risolta', color: '#1b5e20', bg: '#e8f5e9', border: '#c8e6c9' },
}

/**
 * Assistenza: il ristoratore invia un problema o un miglioramento.
 * La richiesta arriva al super admin (ticket) e la risposta compare qui.
 */
function SupportPage({ session }) {
  const [restaurant, setRestaurant] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'problema', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (session) load() }, [session])

  const load = async () => {
    try {
      setLoading(true)
      const { data: r } = await supabase.from('restaurants').select('id, name').eq('user_id', session.user.id).single()
      setRestaurant(r)
      if (r) {
        const { data } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('restaurant_id', r.id)
          .order('created_at', { ascending: false })
        setTickets(data || [])
        // Aprendo la pagina, le risposte risultano lette (toglie il badge nel menu)
        await supabase.rpc('support_tickets_mark_seen')
        window.dispatchEvent(new Event('support-replies-seen'))
      }
    } catch (e) {
      console.error('Errore caricamento assistenza:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const subject = form.subject.trim()
    const message = form.message.trim()
    if (subject.length < 3) return setError('Scrivi un oggetto di almeno 3 caratteri.')
    if (message.length < 5) return setError('Descrivi la richiesta in almeno qualche parola.')
    setSending(true)
    try {
      const { error: insertError } = await supabase.from('support_tickets').insert({
        restaurant_id: restaurant.id,
        type: form.type,
        subject,
        message,
      })
      if (insertError) throw insertError
      notifyAdmin(`Nuovo ticket MVP Menu: ${subject}`, {
        Locale: restaurant.name,
        Tipo: form.type === 'problema' ? 'Problema' : 'Miglioramento',
        Oggetto: subject,
        Messaggio: message,
        Account: session.user.email,
      })
      setSent(true)
      setForm({ type: form.type, subject: '', message: '' })
      load()
    } catch (err) {
      console.error('Errore invio ticket:', err)
      setError('Invio non riuscito. Riprova tra qualche istante.')
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear(); sessionStorage.clear()
    window.location.href = '/#/'; window.location.reload()
  }

  const layoutProps = { restaurantName: restaurant?.name, userName: session?.user?.email, permissions: ['*'], onLogout: handleLogout }

  const card = { background: tokens.colors.white, border: `1px solid ${tokens.colors.gray[200]}`, borderRadius: 12, padding: 20, marginBottom: 16 }
  const label = { display: 'block', fontSize: 14, fontWeight: 600, color: tokens.colors.gray[700], marginBottom: 6 }
  const input = { width: '100%', padding: '11px 12px', fontSize: 14, border: `1px solid ${tokens.colors.gray[300]}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }

  if (loading && !restaurant) {
    return <DashboardLayout {...layoutProps}><Spinner size="lg" text="Caricamento..." centered /></DashboardLayout>
  }

  return (
    <DashboardLayout {...layoutProps}>
      <PageHeader title="Assistenza" subtitle="Segnalaci un problema o proponi un miglioramento: ti rispondiamo qui, nell'app." />

      {sent ? (
        <div style={{ ...card, textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#e8f5e9', border: '1px solid #c8e6c9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1b5e20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Grazie, richiesta inviata!</h3>
          <p style={{ margin: '0 auto 18px', maxWidth: 440, fontSize: 14, color: tokens.colors.gray[600], lineHeight: 1.55 }}>
            L'abbiamo ricevuta e la stiamo leggendo. Riceverai la risposta <strong>qui, nella sezione Assistenza dell'app</strong>: quando arriva, vedrai un avviso nel menu laterale.
          </p>
          <button type="button" onClick={() => setSent(false)} style={{ padding: '10px 18px', borderRadius: 8, border: `1px solid ${tokens.colors.gray[300]}`, background: tokens.colors.white, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Invia un'altra richiesta
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={card}>
          <span style={label}>Di cosa si tratta?</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
            {TYPES.map(t => {
              const on = form.type === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value })}
                  style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: on ? '2px solid #000' : `1px solid ${tokens.colors.gray[300]}`, background: on ? '#000' : tokens.colors.white, color: on ? '#fff' : tokens.colors.black }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{t.hint}</div>
                </button>
              )
            })}
          </div>

          <label style={label} htmlFor="ticket-subject">Oggetto</label>
          <input id="ticket-subject" style={{ ...input, marginBottom: 14 }} maxLength={150} value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder={form.type === 'problema' ? 'Es. Non riesco a stampare il preconto' : 'Es. Vorrei poter dividere il conto'} />

          <label style={label} htmlFor="ticket-message">Descrivi la richiesta</label>
          <textarea id="ticket-message" style={{ ...input, minHeight: 130, resize: 'vertical', marginBottom: 6 }} maxLength={5000} value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder={form.type === 'problema' ? 'Cosa stavi facendo, cosa è successo e da quale dispositivo (telefono, tablet, computer).' : 'Raccontaci l\'idea e a cosa ti servirebbe nel tuo locale.'} />
          <div style={{ fontSize: 12, color: tokens.colors.gray[500], marginBottom: 14 }}>{form.message.length}/5000</div>

          {error && <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#fdecec', border: '1px solid #f5c2c2', color: '#8a1c1c', fontSize: 13 }}>{error}</div>}

          <button type="submit" disabled={sending} style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: '#000', color: '#fff', fontWeight: 700, fontSize: 14, cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.6 : 1 }}>
            {sending ? 'Invio in corso...' : 'Invia richiesta'}
          </button>
        </form>
      )}

      <h3 style={{ margin: '24px 0 12px', fontSize: 16, fontWeight: 700 }}>Le tue richieste</h3>
      {tickets.length === 0 ? (
        <p style={{ fontSize: 14, color: tokens.colors.gray[500] }}>Non hai ancora inviato richieste.</p>
      ) : tickets.map(t => {
        const st = STATUS_UI[t.status] || STATUS_UI.aperto
        return (
          <div key={t.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: tokens.colors.gray[100], border: `1px solid ${tokens.colors.gray[200]}` }}>
                {t.type === 'problema' ? 'Problema' : 'Miglioramento'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.label}</span>
              <span style={{ fontSize: 12, color: tokens.colors.gray[500] }}>{formatDateIt(t.created_at)}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.subject}</div>
            <div style={{ fontSize: 14, color: tokens.colors.gray[700], whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{t.message}</div>
            {t.admin_reply && (
              <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: tokens.colors.gray[50], borderLeft: '3px solid #000' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tokens.colors.gray[600], marginBottom: 4 }}>
                  Risposta di MVP Menu{t.replied_at ? ` · ${formatDateIt(t.replied_at)}` : ''}
                </div>
                <div style={{ fontSize: 14, color: tokens.colors.black, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{t.admin_reply}</div>
              </div>
            )}
          </div>
        )
      })}
    </DashboardLayout>
  )
}

export default SupportPage
