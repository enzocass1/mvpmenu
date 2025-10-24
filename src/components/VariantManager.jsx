import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

/**
 * VARIANT MANAGER
 * Gestione completa varianti prodotto stile Shopify
 * - Opzioni (Size, Color, Temperature, etc)
 * - Valori opzioni (S/M/L, Red/Blue, Hot/Cold)
 * - Varianti (combinazioni di opzioni)
 */
function VariantManager({ product, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('options') // options | variants
  const [loading, setLoading] = useState(true)

  // Options & Values
  const [options, setOptions] = useState([])
  const [newOptionName, setNewOptionName] = useState('')
  const [editingOption, setEditingOption] = useState(null)
  const [newValueInput, setNewValueInput] = useState({}) // { optionId: 'value' }

  // Variants
  const [variants, setVariants] = useState([])
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [editingVariant, setEditingVariant] = useState(null)
  const [variantFormData, setVariantFormData] = useState({
    title: '',
    sku: '',
    price: '',
    option_values: {}
  })

  useEffect(() => {
    loadAll()
  }, [product.id])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadOptions(), loadVariants()])
    setLoading(false)
  }

  const loadOptions = async () => {
    // Carica opzioni e i loro valori
    const { data: optionsData, error: optionsError } = await supabase
      .from('v_product_variant_options')
      .select('*')
      .eq('product_id', product.id)
      .order('position')

    if (optionsError) {
      console.error('Error loading options:', optionsError)
      return
    }

    // Per ogni opzione, carica i valori
    const optionsWithValues = await Promise.all(
      (optionsData || []).map(async (option) => {
        const { data: valuesData } = await supabase
          .from('v_product_variant_option_values')
          .select('*')
          .eq('option_id', option.id)
          .order('position')

        return {
          ...option,
          values: valuesData || []
        }
      })
    )

    setOptions(optionsWithValues)
  }

  const loadVariants = async () => {
    const { data, error } = await supabase
      .from('v_product_variants')
      .select('*')
      .eq('product_id', product.id)
      .order('position')

    if (!error && data) {
      setVariants(data)
    }
  }

  // ==================== OPTIONS MANAGEMENT ====================

  const addOption = async () => {
    if (!newOptionName.trim()) return

    try {
      const { error } = await supabase
        .from('product_variant_options')
        .insert({
          product_id: product.id,
          name: newOptionName.trim(),
          position: options.length
        })

      if (error) throw error

      setNewOptionName('')
      await loadOptions()
    } catch (error) {
      console.error('Error adding option:', error)
      alert('Errore durante l\'aggiunta dell\'opzione')
    }
  }

  const deleteOption = async (optionId) => {
    if (!confirm('Eliminare questa opzione? Verranno eliminate anche tutte le varianti associate.')) return

    try {
      const { error } = await supabase
        .from('product_variant_options')
        .delete()
        .eq('id', optionId)

      if (error) throw error
      await loadAll()
    } catch (error) {
      console.error('Error deleting option:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  const addValue = async (optionId) => {
    const value = newValueInput[optionId]?.trim()
    if (!value) return

    try {
      const option = options.find(o => o.id === optionId)
      const { error } = await supabase
        .from('product_variant_option_values')
        .insert({
          option_id: optionId,
          value: value,
          position: option.values.length
        })

      if (error) throw error

      setNewValueInput({ ...newValueInput, [optionId]: '' })
      await loadOptions()
    } catch (error) {
      console.error('Error adding value:', error)
      alert('Errore durante l\'aggiunta del valore')
    }
  }

  const deleteValue = async (valueId) => {
    if (!confirm('Eliminare questo valore?')) return

    try {
      const { error } = await supabase
        .from('product_variant_option_values')
        .delete()
        .eq('id', valueId)

      if (error) throw error
      await loadOptions()
    } catch (error) {
      console.error('Error deleting value:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  // ==================== VARIANTS MANAGEMENT ====================

  const openVariantForm = (variant = null) => {
    if (variant) {
      setEditingVariant(variant)
      setVariantFormData({
        title: variant.title,
        sku: variant.sku || '',
        price: variant.price?.toString() || '',
        option_values: variant.option_values || {}
      })
    } else {
      setEditingVariant(null)
      setVariantFormData({
        title: '',
        sku: '',
        price: '',
        option_values: {}
      })
    }
    setShowVariantForm(true)
  }

  const saveVariant = async () => {
    try {
      // Auto-genera title se vuoto
      let title = variantFormData.title.trim()
      if (!title && Object.keys(variantFormData.option_values).length > 0) {
        title = Object.values(variantFormData.option_values).join(' / ')
      }

      const variantData = {
        product_id: product.id,
        title: title || 'Variante',
        sku: variantFormData.sku.trim() || null,
        price: variantFormData.price ? parseFloat(variantFormData.price) : null,
        option_values: variantFormData.option_values,
        position: editingVariant ? editingVariant.position : variants.length
      }

      if (editingVariant) {
        const { error } = await supabase
          .from('product_variants')
          .update(variantData)
          .eq('id', editingVariant.id)

        if (error) throw error
        alert('Variante aggiornata!')
      } else {
        const { error } = await supabase
          .from('product_variants')
          .insert(variantData)

        if (error) throw error
        alert('Variante creata!')
      }

      setShowVariantForm(false)
      await loadVariants()
      if (onSave) onSave()
    } catch (error) {
      console.error('Error saving variant:', error)
      alert('Errore durante il salvataggio della variante')
    }
  }

  const deleteVariant = async (variantId) => {
    if (!confirm('Eliminare questa variante?')) return

    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId)

      if (error) throw error
      await loadVariants()
      if (onSave) onSave()
    } catch (error) {
      console.error('Error deleting variant:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  const toggleVariantAvailability = async (variant) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ is_available: !variant.is_available })
        .eq('id', variant.id)

      if (error) throw error
      await loadVariants()
    } catch (error) {
      console.error('Error toggling availability:', error)
    }
  }

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p>Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Varianti: {product.name}</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'options' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('options')}
          >
            Opzioni ({options.length})
          </button>
          <button
            style={activeTab === 'variants' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('variants')}
          >
            Varianti ({variants.length})
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'options' && (
            <div>
              <p style={styles.description}>
                Le opzioni sono caratteristiche del prodotto (es. Size, Color, Temperature).
                Ogni opzione può avere più valori (es. S/M/L per Size).
              </p>

              {/* Add Option */}
              <div style={styles.addSection}>
                <input
                  type="text"
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Nome opzione (es. Size, Color)"
                  style={styles.input}
                  onKeyDown={(e) => e.key === 'Enter' && addOption()}
                />
                <button onClick={addOption} style={styles.button}>
                  + Aggiungi Opzione
                </button>
              </div>

              {/* Options List */}
              {options.length === 0 && (
                <p style={styles.emptyState}>Nessuna opzione. Inizia aggiungendone una!</p>
              )}

              {options.map((option) => (
                <div key={option.id} style={styles.optionCard}>
                  <div style={styles.optionHeader}>
                    <strong>{option.name}</strong>
                    <button
                      onClick={() => deleteOption(option.id)}
                      style={styles.deleteButton}
                    >
                      Elimina
                    </button>
                  </div>

                  {/* Values */}
                  <div style={styles.valuesSection}>
                    {option.values.map((val) => (
                      <div key={val.id} style={styles.valueChip}>
                        <span>{val.value}</span>
                        <button
                          onClick={() => deleteValue(val.id)}
                          style={styles.chipDelete}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Value */}
                  <div style={styles.addValueSection}>
                    <input
                      type="text"
                      value={newValueInput[option.id] || ''}
                      onChange={(e) => setNewValueInput({ ...newValueInput, [option.id]: e.target.value })}
                      placeholder={`Aggiungi valore (es. ${option.name === 'Size' ? 'Small, Medium, Large' : 'Hot, Cold'})`}
                      style={styles.inputSmall}
                      onKeyDown={(e) => e.key === 'Enter' && addValue(option.id)}
                    />
                    <button onClick={() => addValue(option.id)} style={styles.buttonSmall}>
                      + Aggiungi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'variants' && (
            <div>
              <p style={styles.description}>
                Le varianti sono combinazioni di opzioni con prezzi specifici.
                {options.length === 0 && ' Crea prima almeno un\'opzione!'}
              </p>

              <button
                onClick={() => openVariantForm()}
                style={styles.button}
                disabled={options.length === 0}
              >
                + Crea Variante
              </button>

              {/* Variants List */}
              {variants.length === 0 && (
                <p style={styles.emptyState}>
                  {options.length === 0
                    ? 'Crea prima le opzioni, poi potrai creare varianti.'
                    : 'Nessuna variante. Crea la prima!'}
                </p>
              )}

              {variants.map((variant) => (
                <div key={variant.id} style={styles.variantCard}>
                  <div style={styles.variantHeader}>
                    <div>
                      <strong>{variant.title}</strong>
                      {variant.sku && <span style={styles.sku}> ({variant.sku})</span>}
                    </div>
                    <div style={styles.variantActions}>
                      <span style={styles.price}>
                        {variant.price ? `€${variant.price.toFixed(2)}` : `€${product.price.toFixed(2)} (base)`}
                      </span>
                      <button
                        onClick={() => toggleVariantAvailability(variant)}
                        style={variant.is_available ? styles.statusAvailable : styles.statusUnavailable}
                      >
                        {variant.is_available ? '✓ Disponibile' : '✗ Non disponibile'}
                      </button>
                      <button onClick={() => openVariantForm(variant)} style={styles.editButton}>
                        Modifica
                      </button>
                      <button onClick={() => deleteVariant(variant.id)} style={styles.deleteButton}>
                        Elimina
                      </button>
                    </div>
                  </div>
                  <div style={styles.variantOptions}>
                    {Object.entries(variant.option_values).map(([key, value]) => (
                      <span key={key} style={styles.optionBadge}>
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variant Form Modal */}
        {showVariantForm && (
          <div style={styles.overlay} onClick={() => setShowVariantForm(false)}>
            <div style={styles.formModal} onClick={(e) => e.stopPropagation()}>
              <h3>{editingVariant ? 'Modifica Variante' : 'Nuova Variante'}</h3>

              <label style={styles.label}>
                Titolo (auto-generato se vuoto)
                <input
                  type="text"
                  value={variantFormData.title}
                  onChange={(e) => setVariantFormData({ ...variantFormData, title: e.target.value })}
                  placeholder="es. Medium / Hot"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                SKU (opzionale)
                <input
                  type="text"
                  value={variantFormData.sku}
                  onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                  placeholder="es. CAFE-M-HOT"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                Prezzo (lascia vuoto per usare prezzo base: €{product.price.toFixed(2)})
                <input
                  type="number"
                  step="0.01"
                  value={variantFormData.price}
                  onChange={(e) => setVariantFormData({ ...variantFormData, price: e.target.value })}
                  placeholder={product.price.toFixed(2)}
                  style={styles.input}
                />
              </label>

              <div style={styles.optionsSelector}>
                <strong>Valori Opzioni:</strong>
                {options.map((option) => (
                  <label key={option.id} style={styles.label}>
                    {option.name}
                    <select
                      value={variantFormData.option_values[option.name] || ''}
                      onChange={(e) => setVariantFormData({
                        ...variantFormData,
                        option_values: { ...variantFormData.option_values, [option.name]: e.target.value }
                      })}
                      style={styles.select}
                    >
                      <option value="">-- Seleziona --</option>
                      {option.values.map((val) => (
                        <option key={val.id} value={val.value}>{val.value}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <div style={styles.formActions}>
                <button onClick={saveVariant} style={styles.button}>
                  {editingVariant ? 'Aggiorna' : 'Crea'}
                </button>
                <button onClick={() => setShowVariantForm(false)} style={styles.cancelButton}>
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
  },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
  },
  tabActive: {
    flex: 1,
    padding: '12px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#000',
    borderBottom: '2px solid #000',
  },
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  description: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '16px',
  },
  addSection: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  inputSmall: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
  },
  select: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  buttonSmall: {
    padding: '6px 12px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f0f0f0',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    padding: '40px',
    fontSize: '14px',
  },
  optionCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    backgroundColor: '#fafafa',
  },
  optionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  valuesSection: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  valueChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '16px',
    fontSize: '13px',
  },
  chipDelete: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#999',
    padding: '0',
    lineHeight: '1',
  },
  addValueSection: {
    display: 'flex',
    gap: '8px',
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  variantCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '12px',
    backgroundColor: '#fff',
  },
  variantHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  variantActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  price: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
  },
  sku: {
    fontSize: '12px',
    color: '#999',
  },
  variantOptions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  optionBadge: {
    padding: '4px 8px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    fontSize: '12px',
  },
  statusAvailable: {
    padding: '6px 12px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  statusUnavailable: {
    padding: '6px 12px',
    backgroundColor: '#999',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  formModal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  label: {
    display: 'block',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '500',
  },
  optionsSelector: {
    marginTop: '20px',
    marginBottom: '20px',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
}

export default VariantManager
