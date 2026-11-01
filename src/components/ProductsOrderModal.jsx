import { useState, useEffect, useRef } from 'react'

/**
 * Modale generico per riordinare elementi (prodotti o categorie) trascinandoli
 * in verticale (mouse + touch via Pointer Events) e/o con ordinamenti rapidi.
 * Il genitore passa gli `items` già caricati, le opzioni di ordinamento e `onSave`.
 */
function ProductsOrderModal({ title = 'Ordina', subtitle, items: initialItems = [], sortOptions = [], onSave, onClose, zIndex = 2000 }) {
  const [items, setItems] = useState(initialItems)
  const [saving, setSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [sortValue, setSortValue] = useState('manual')
  const itemRefs = useRef([])

  useEffect(() => { setItems(initialItems) }, [initialItems])

  const applySort = (value) => {
    setSortValue(value)
    if (value === 'manual') return
    const opt = sortOptions.find(o => o.value === value)
    if (opt?.compare) setItems(prev => [...prev].sort(opt.compare))
  }

  const handlePointerMove = (clientY) => {
    if (dragIndex === null) return
    const positions = itemRefs.current.map(el => {
      if (!el) return Infinity
      const r = el.getBoundingClientRect()
      return r.top + r.height / 2
    })
    let target = positions.findIndex(mid => clientY < mid)
    if (target === -1) target = items.length - 1
    if (target !== dragIndex && target >= 0) {
      setSortValue('manual')
      setItems(prev => {
        const next = [...prev]
        const [moved] = next.splice(dragIndex, 1)
        next.splice(target, 0, moved)
        return next
      })
      setDragIndex(target)
    }
  }

  useEffect(() => {
    if (dragIndex === null) return
    const move = (e) => handlePointerMove(e.touches ? e.touches[0].clientY : e.clientY)
    const end = () => setDragIndex(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragIndex, items])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(items)
      onClose(true)
    } catch (error) {
      console.error('Errore salvataggio ordine:', error)
      alert('Errore durante il salvataggio dell\'ordine')
      setSaving(false)
    }
  }

  return (
    <div style={{ ...styles.overlay, zIndex }} onClick={() => !saving && onClose(false)}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>{title}</div>
            {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
          </div>
          <button style={styles.close} onClick={() => !saving && onClose(false)} aria-label="Chiudi">×</button>
        </div>

        {sortOptions.length > 0 && (
          <div style={styles.sortBar}>
            <label style={styles.sortLabel}>Ordina per</label>
            <select value={sortValue} onChange={(e) => applySort(e.target.value)} style={styles.select}>
              <option value="manual">Manuale (trascina)</option>
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        <div style={styles.hint}>Tieni premuto e trascina in alto o in basso per cambiare l'ordine nel menu.</div>

        <div style={styles.list}>
          {items.length === 0 ? (
            <div style={styles.empty}>Nessun elemento.</div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                ref={el => (itemRefs.current[index] = el)}
                style={{ ...styles.row, ...(dragIndex === index ? styles.rowDragging : {}), opacity: item.hidden ? 0.5 : 1 }}
              >
                <div
                  style={styles.handle}
                  onPointerDown={(e) => { e.currentTarget.releasePointerCapture?.(e.pointerId); setDragIndex(index) }}
                  title="Trascina"
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="#9ca3af">
                    <circle cx="5" cy="3" r="1.3"/><circle cx="11" cy="3" r="1.3"/>
                    <circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/>
                    <circle cx="5" cy="13" r="1.3"/><circle cx="11" cy="13" r="1.3"/>
                  </svg>
                </div>
                <div style={styles.pos}>{index + 1}</div>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt="" style={styles.thumb} />
                  : <div style={{ ...styles.thumb, background: '#f1f1f1' }} />}
                <div style={styles.name}>
                  {item.name}{item.hidden ? ' (nascosto)' : ''}
                  {item.subLabel && <span style={styles.subLabel}>{item.subLabel}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.cancel} onClick={() => onClose(false)} disabled={saving}>Annulla</button>
          <button style={styles.save} onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva e aggiorna'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' },
  modal: { background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '460px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid #eee' },
  title: { fontSize: '17px', fontWeight: 700, color: '#111' },
  subtitle: { fontSize: '13px', color: '#777' },
  close: { border: 'none', background: 'transparent', fontSize: '26px', lineHeight: 1, cursor: 'pointer', color: '#555' },
  sortBar: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px 0' },
  sortLabel: { fontSize: '13px', color: '#555', fontWeight: 600 },
  select: { flex: 1, padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', background: '#fff', color: '#111' },
  hint: { padding: '10px 18px', fontSize: '13px', color: '#64748B' },
  list: { padding: '0 14px 10px', overflowY: 'auto', flex: 1, touchAction: 'pan-y' },
  row: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', border: '1px solid #ECECEC', borderRadius: '10px', marginBottom: '8px', background: '#fff', userSelect: 'none' },
  rowDragging: { background: '#EEF2FF', boxShadow: '0 6px 16px rgba(0,0,0,0.12)', borderColor: '#C7D2FE' },
  handle: { cursor: 'grab', padding: '4px', touchAction: 'none', display: 'flex', alignItems: 'center' },
  pos: { width: '22px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#94a3b8' },
  thumb: { width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 },
  name: { fontSize: '14px', color: '#111', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  subLabel: { marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 400 },
  empty: { padding: '20px', textAlign: 'center', color: '#999' },
  footer: { display: 'flex', gap: '10px', padding: '14px 18px', borderTop: '1px solid #eee' },
  cancel: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #E0E0E0', background: '#fff', color: '#111', fontWeight: 600, cursor: 'pointer' },
  save: { flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#000', color: '#fff', fontWeight: 600, cursor: 'pointer' }
}

export default ProductsOrderModal
