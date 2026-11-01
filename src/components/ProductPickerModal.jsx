import { useState, useMemo } from 'react'
import { formatPrice } from '../lib/priceFormat'

/**
 * Modale per SCEGLIERE più prodotti (multi-selezione con ricerca e miniature).
 * Mantiene l'ordine di selezione: i nuovi prodotti vengono aggiunti in fondo.
 * Il genitore passa l'elenco prodotti e gli id già scelti; onSave riceve gli id scelti.
 */
export default function ProductPickerModal({ products = [], selectedIds = [], onSave, onClose, title = 'Scegli i prodotti', zIndex = 3200 }) {
  const [sel, setSel] = useState(() => selectedIds.filter(id => products.some(p => p.id === id)))
  const [query, setQuery] = useState('')

  const toggle = (id) => setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? products.filter(p => p.name?.toLowerCase().includes(q)) : products
  }, [query, products])

  return (
    <div style={{ ...S.overlay, zIndex }} onClick={() => onClose?.()}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <div>
            <div style={S.title}>{title}</div>
            <div style={S.subtitle}>{sel.length} selezionati</div>
          </div>
          <button style={S.close} onClick={() => onClose?.()} aria-label="Chiudi">×</button>
        </div>

        <div style={{ padding: '12px 16px 6px' }}>
          <input style={S.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca un prodotto…" />
        </div>

        <div style={S.list}>
          {filtered.length === 0 ? (
            <div style={S.empty}>Nessun prodotto trovato.</div>
          ) : (
            filtered.map(p => {
              const checked = sel.includes(p.id)
              return (
                <label key={p.id} style={{ ...S.row, ...(checked ? S.rowOn : {}) }}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} style={{ width: 18, height: 18, flexShrink: 0 }} />
                  {p.image_url
                    ? <img src={p.image_url} alt="" style={S.thumb} />
                    : <div style={{ ...S.thumb, background: '#f1f1f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍽️</div>}
                  <span style={S.name}>{p.name}</span>
                  <span style={S.price}>{formatPrice(p)}</span>
                </label>
              )
            })
          )}
        </div>

        <div style={S.footer}>
          <button style={S.cancel} onClick={() => onClose?.()}>Annulla</button>
          <button style={S.save} onClick={() => onSave?.(sel)}>Salva ({sel.length})</button>
        </div>
      </div>
    </div>
  )
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 },
  modal: { background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid #eee' },
  title: { fontSize: 17, fontWeight: 700, color: '#111' },
  subtitle: { fontSize: 13, color: '#777', marginTop: 2 },
  close: { border: 'none', background: 'transparent', fontSize: 26, lineHeight: 1, cursor: 'pointer', color: '#555' },
  search: { width: '100%', padding: 11, borderRadius: 10, border: '1px solid #E0E0E0', fontSize: 14, boxSizing: 'border-box', background: '#fff', color: '#111' },
  list: { padding: '6px 12px 10px', overflowY: 'auto', flex: 1 },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: '1px solid #F0F0F0', marginBottom: 6, background: '#fff', cursor: 'pointer' },
  rowOn: { background: '#EEF2FF', borderColor: '#C7D2FE' },
  thumb: { width: 42, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0 },
  name: { flex: 1, fontSize: 14, color: '#111', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  price: { fontSize: 13, color: '#777', fontWeight: 600, flexShrink: 0 },
  empty: { padding: 24, textAlign: 'center', color: '#999' },
  footer: { display: 'flex', gap: 10, padding: '14px 18px', borderTop: '1px solid #eee' },
  cancel: { flex: 1, padding: 12, borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', color: '#111', fontWeight: 600, cursor: 'pointer' },
  save: { flex: 2, padding: 12, borderRadius: 8, border: 'none', background: '#000', color: '#fff', fontWeight: 700, cursor: 'pointer' }
}
