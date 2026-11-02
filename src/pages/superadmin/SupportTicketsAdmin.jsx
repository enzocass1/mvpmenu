/**
 * Super Admin — Ticket di assistenza
 * Problemi e miglioramenti inviati dai ristoratori; la risposta compare
 * al ristoratore nella sua pagina Assistenza.
 */
import React, { useState, useEffect } from 'react'
import SuperAdminLayout from '../../components/ui/SuperAdminLayout'
import { tokens } from '../../styles/tokens'
import { supabase } from '../../supabaseClient'
import superAdminService from '../../services/superAdminService'
import { formatDateIt } from '../../lib/subscriptionStatus'

const STATUS = [
  { value: 'aperto', label: 'Aperto' },
  { value: 'in_lavorazione', label: 'In lavorazione' },
  { value: 'risolto', label: 'Risolto' },
]

function SupportTicketsAdmin() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('da_gestire')
  const [drafts, setDrafts] = useState({}) // { ticketId: { reply, status } }
  const [savingId, setSavingId] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, restaurants(name, subdomain)')
      .order('created_at', { ascending: false })
    if (error) console.error('Errore caricamento ticket:', error)
    setTickets(data || [])
    setDrafts(Object.fromEntries((data || []).map(t => [t.id, { reply: t.admin_reply || '', status: t.status }])))
    setLoading(false)
  }

  const save = async (t) => {
    const d = drafts[t.id]
    setSavingId(t.id)
    const { error } = await supabase
      .from('support_tickets')
      .update({ admin_reply: d.reply.trim() || null, status: d.status })
      .eq('id', t.id)
    if (error) {
      alert('Salvataggio non riuscito: ' + error.message)
    } else {
      const s = superAdminService.getSession()
      if (s?.admin_id) superAdminService.logAction(s.admin_id, 'support_ticket.updated', { status: d.status, replied: !!d.reply.trim() }, 'support_ticket', t.id)
      await load()
    }
    setSavingId(null)
  }

  const shown = tickets.filter(t => filter === 'tutti' ? true : filter === 'da_gestire' ? t.status !== 'risolto' : t.status === 'risolto')
  const openCount = tickets.filter(t => t.status !== 'risolto').length

  const card = { background: '#fff', border: `1px solid ${tokens.colors.gray[200]}`, borderRadius: 12, padding: 18, marginBottom: 14 }
  const chip = (on) => ({ padding: '7px 14px', borderRadius: 999, border: on ? '1px solid #000' : `1px solid ${tokens.colors.gray[300]}`, background: on ? '#000' : '#fff', color: on ? '#fff' : '#111', fontSize: 13, fontWeight: 600, cursor: 'pointer' })

  return (
    <SuperAdminLayout>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800 }}>Ticket assistenza</h1>
      <p style={{ margin: '0 0 18px', color: tokens.colors.gray[600], fontSize: 14 }}>
        {openCount} da gestire · la risposta compare al ristoratore nella sua pagina Assistenza.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button style={chip(filter === 'da_gestire')} onClick={() => setFilter('da_gestire')}>Da gestire</button>
        <button style={chip(filter === 'risolti')} onClick={() => setFilter('risolti')}>Risolti</button>
        <button style={chip(filter === 'tutti')} onClick={() => setFilter('tutti')}>Tutti</button>
      </div>

      {loading ? <p>Caricamento…</p> : shown.length === 0 ? (
        <p style={{ color: tokens.colors.gray[500] }}>Nessun ticket in questa vista.</p>
      ) : shown.map(t => {
        const d = drafts[t.id] || { reply: '', status: t.status }
        return (
          <div key={t.id} style={card}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              <strong style={{ fontSize: 15 }}>{t.restaurants?.name || 'Ristorante'}</strong>
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: t.type === 'problema' ? '#fdecec' : '#eff6ff', color: t.type === 'problema' ? '#8a1c1c' : '#1e40af' }}>
                {t.type === 'problema' ? 'Problema' : 'Miglioramento'}
              </span>
              <span style={{ fontSize: 12, color: tokens.colors.gray[500] }}>{formatDateIt(t.created_at)}</span>
            </div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.subject}</div>
            <div style={{ fontSize: 14, color: tokens.colors.gray[700], whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 12 }}>{t.message}</div>

            <textarea
              value={d.reply}
              onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...d, reply: e.target.value } })}
              placeholder="Scrivi la risposta per il ristoratore…"
              style={{ width: '100%', minHeight: 80, padding: 10, fontSize: 14, border: `1px solid ${tokens.colors.gray[300]}`, borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              <select
                value={d.status}
                onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...d, status: e.target.value } })}
                style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${tokens.colors.gray[300]}`, fontSize: 14 }}
              >
                {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button
                onClick={() => save(t)}
                disabled={savingId === t.id}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#000', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: savingId === t.id ? 0.6 : 1 }}
              >
                {savingId === t.id ? 'Salvataggio…' : 'Salva risposta'}
              </button>
              {t.replied_at && <span style={{ fontSize: 12, color: tokens.colors.gray[500] }}>Ultima risposta: {formatDateIt(t.replied_at)}{t.owner_seen_at && new Date(t.owner_seen_at) >= new Date(t.replied_at) ? ' · letta' : ' · non ancora letta'}</span>}
            </div>
          </div>
        )
      })}
    </SuperAdminLayout>
  )
}

export default SupportTicketsAdmin
