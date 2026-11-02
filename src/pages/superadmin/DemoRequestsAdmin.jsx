/**
 * Super Admin — Richieste demo
 * Le richieste inviate dal form della home page pubblica.
 */
import React, { useState, useEffect } from 'react'
import SuperAdminLayout from '../../components/ui/SuperAdminLayout'
import { tokens } from '../../styles/tokens'
import { supabase } from '../../supabaseClient'
import { formatDateIt } from '../../lib/subscriptionStatus'

const STATUS = [
  { value: 'nuova', label: 'Nuova' },
  { value: 'contattato', label: 'Contattato' },
  { value: 'chiusa', label: 'Chiusa' },
]

function DemoRequestsAdmin() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('demo_requests').select('*').order('created_at', { ascending: false })
    if (error) console.error('Errore caricamento richieste demo:', error)
    setRows(data || [])
    setLoading(false)
  }

  const update = async (id, patch) => {
    const { error } = await supabase.from('demo_requests').update(patch).eq('id', id)
    if (error) alert('Salvataggio non riuscito: ' + error.message)
    else setRows(rows.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  // Numero di telefono in formato WhatsApp (solo cifre, prefisso Italia se manca)
  const waNumber = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '')
    if (!digits) return null
    return digits.startsWith('39') ? digits : `39${digits.replace(/^0+/, '')}`
  }

  const newCount = rows.filter(r => r.status === 'nuova').length
  const card = { background: '#fff', border: `1px solid ${tokens.colors.gray[200]}`, borderRadius: 12, padding: 18, marginBottom: 14 }

  return (
    <SuperAdminLayout>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800 }}>Richieste demo</h1>
      <p style={{ margin: '0 0 18px', color: tokens.colors.gray[600], fontSize: 14 }}>
        {newCount} nuove · inviate dal form della home page.
      </p>

      {loading ? <p>Caricamento…</p> : rows.length === 0 ? (
        <p style={{ color: tokens.colors.gray[500] }}>Nessuna richiesta ancora.</p>
      ) : rows.map(r => (
        <div key={r.id} style={card}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            <strong style={{ fontSize: 15 }}>{r.name}</strong>
            {r.business_name && <span style={{ fontSize: 14, color: tokens.colors.gray[700] }}>· {r.business_name}</span>}
            {r.city && <span style={{ fontSize: 13, color: tokens.colors.gray[500] }}>· {r.city}</span>}
            <span style={{ fontSize: 12, color: tokens.colors.gray[500] }}>{formatDateIt(r.created_at)}</span>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 14, marginBottom: 8 }}>
            <a href={`mailto:${r.email}`} style={{ color: '#000' }}>{r.email}</a>
            {r.phone && <a href={`tel:${r.phone}`} style={{ color: '#000' }}>{r.phone}</a>}
            {waNumber(r.phone) && <a href={`https://wa.me/${waNumber(r.phone)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1b5e20', fontWeight: 600 }}>Scrivi su WhatsApp</a>}
          </div>
          {r.message && <div style={{ fontSize: 14, color: tokens.colors.gray[700], whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 10 }}>{r.message}</div>}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={r.status} onChange={(e) => update(r.id, { status: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${tokens.colors.gray[300]}`, fontSize: 14 }}>
              {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input
              defaultValue={r.admin_notes || ''}
              onBlur={(e) => { if ((e.target.value || '') !== (r.admin_notes || '')) update(r.id, { admin_notes: e.target.value || null }) }}
              placeholder="Note interne (salvate quando esci dal campo)"
              style={{ flex: '1 1 260px', padding: '8px 10px', borderRadius: 8, border: `1px solid ${tokens.colors.gray[300]}`, fontSize: 14 }}
            />
          </div>
        </div>
      ))}
    </SuperAdminLayout>
  )
}

export default DemoRequestsAdmin
