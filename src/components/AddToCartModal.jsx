import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'

// Helper functions for theme styling (must be defined before component)
const getThemeStyles = (themeConfig) => {
  if (!themeConfig) return {} // Usa stili default se non c'è theme_config

  return {
    primaryColor: themeConfig.primaryColor || '#000000',
    secondaryColor: themeConfig.secondaryColor || '#ffffff',
    textPrimaryColor: themeConfig.textPrimaryColor || '#ffffff',
    textSecondaryColor: themeConfig.textSecondaryColor || '#111827',
    textTertiaryColor: themeConfig.textTertiaryColor || '#999999',
    borderColor: themeConfig.borderColor || '#e0e0e0',
    errorColor: themeConfig.errorColor || '#f44336',
    backgroundTertiary: themeConfig.backgroundTertiary || '#f9f9f9',
  }
}

/**
 * Modale per aggiungere prodotto al carrello
 * Permette di selezionare varianti, quantità e aggiungere note
 */
function AddToCartModal({ isOpen, onClose, product, onAddToCart, restaurant }) {
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [variants, setVariants] = useState([])
  const [options, setOptions] = useState([])
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState({}) // {optionName: value}
  const [loadingVariants, setLoadingVariants] = useState(false)

  // Calcola stili dinamici basati sul theme_config del ristorante
  const themeStyles = useMemo(() => {
    return getThemeStyles(restaurant?.theme_config)
  }, [restaurant])

  // Genera stili completi con il tema applicato
  const styles = useMemo(() => {
    return getStyles(themeStyles)
  }, [themeStyles])

  // Carica varianti quando il modal si apre
  useEffect(() => {
    if (isOpen && product) {
      loadVariants()
    }
  }, [isOpen, product])

  // Blocca lo scroll del body quando il modal è aperto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Scrolla il modal container in alto
      const modalContainer = document.getElementById('add-to-cart-modal-container')
      if (modalContainer) {
        modalContainer.scrollTop = 0
      }
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const loadVariants = async () => {
    if (!product?.id) return

    setLoadingVariants(true)
    try {
      // Carica opzioni
      const { data: optionsData, error: optionsError } = await supabase
        .from('v_product_variant_options')
        .select('*')
        .eq('product_id', product.id)
        .order('position')

      if (optionsError) throw optionsError

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

      // Carica varianti disponibili
      const { data: variantsData, error: variantsError } = await supabase
        .from('v_product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_available', true)
        .order('position')

      if (variantsError) throw variantsError

      setVariants(variantsData || [])

      // Se c'è una variante preselezionata, usala
      if (product.preselectedVariant) {
        setSelectedVariant(product.preselectedVariant)
        setSelectedOptions(product.preselectedVariant.option_values || {})
      }
      // Altrimenti, se c'è solo una variante, selezionala automaticamente
      else if (variantsData && variantsData.length === 1) {
        setSelectedVariant(variantsData[0])
        setSelectedOptions(variantsData[0].option_values || {})
      }
    } catch (error) {
      console.error('Errore caricamento varianti:', error)
    } finally {
      setLoadingVariants(false)
    }
  }

  // Quando l'utente seleziona un'opzione, trova la variante corrispondente
  const handleOptionChange = (optionName, value) => {
    const newSelectedOptions = { ...selectedOptions, [optionName]: value }
    setSelectedOptions(newSelectedOptions)

    // Trova la variante che corrisponde alle opzioni selezionate
    const matchingVariant = variants.find(variant => {
      const variantOptions = variant.option_values || {}
      return Object.keys(newSelectedOptions).every(
        key => variantOptions[key] === newSelectedOptions[key]
      )
    })

    setSelectedVariant(matchingVariant || null)
  }

  if (!isOpen || !product) return null

  // Calcola il prezzo finale (variante o prodotto base)
  const finalPrice = selectedVariant?.price || product.price
  const hasVariants = options.length > 0

  const handleSubmit = (e) => {
    e.preventDefault()

    // Se ci sono varianti ma nessuna è selezionata, non procedere
    if (hasVariants && !selectedVariant) {
      alert('Seleziona tutte le opzioni prima di aggiungere al carrello')
      return
    }

    // Prepara i dati del prodotto con variante
    const productToAdd = {
      ...product,
      quantity,
      notes: notes.trim(),
      // Aggiungi dati variante se presente
      ...(selectedVariant && {
        variant_id: selectedVariant.id,
        variant_title: selectedVariant.title,
        price: selectedVariant.price || product.price,
        option_values: selectedVariant.option_values
      })
    }

    onAddToCart(productToAdd)

    // Reset e chiudi
    setQuantity(1)
    setNotes('')
    setSelectedVariant(null)
    setSelectedOptions({})
    onClose()
  }

  const handleClose = () => {
    setQuantity(1)
    setNotes('')
    setSelectedVariant(null)
    setSelectedOptions({})
    onClose()
  }

  const handleOverlayClick = (e) => {
    // Chiudi solo se si clicca sull'overlay, non sul modal
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div
      id="add-to-cart-modal-container"
      style={styles.modalContainer}
      onClick={handleOverlayClick}
    >
      {/* Modal */}
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>Aggiungi al carrello</h3>
          <button
            onClick={handleClose}
            style={styles.closeButton}
            aria-label="Chiudi"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={styles.body}>
          {/* Product Info */}
          <div style={styles.productInfo}>
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                style={styles.productImage}
              />
            )}
            <div style={{ flex: 1 }}>
              <h4 style={styles.productName}>{product.name}</h4>
              {product.description && (
                <p style={styles.productDescription}>{product.description}</p>
              )}
              {/* Mostra prezzo solo se non ci sono varianti */}
              {!hasVariants && (
                <p style={styles.productPrice}>
                  €{finalPrice.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Variants Selection */}
          {loadingVariants && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Caricamento varianti...
            </div>
          )}

          {!loadingVariants && hasVariants && (
            <div style={styles.variantsSection}>
              <h5 style={styles.variantsSectionTitle}>Seleziona opzioni</h5>
              {options.map((option) => (
                <div key={option.id} style={styles.optionGroup}>
                  <label style={styles.optionLabel}>{option.name}</label>
                  <div style={styles.optionValues}>
                    {option.values.map((value) => {
                      const isSelected = selectedOptions[option.name] === value.value
                      return (
                        <button
                          key={value.id}
                          type="button"
                          onClick={() => handleOptionChange(option.name, value.value)}
                          style={{
                            ...styles.optionButton,
                            ...(isSelected ? styles.optionButtonSelected : {})
                          }}
                        >
                          {value.value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {selectedVariant && (
                <div style={styles.variantInfo}>
                  <span style={styles.variantInfoLabel}>Variante selezionata:</span>
                  <span style={styles.variantInfoValue}>{selectedVariant.title}</span>
                </div>
              )}
              {hasVariants && !selectedVariant && Object.keys(selectedOptions).length > 0 && (
                <div style={{ ...styles.variantInfo, color: '#f44336' }}>
                  ⚠️ Combinazione non disponibile
                </div>
              )}
            </div>
          )}

          {/* Quantity */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Quantità</label>
            <div style={styles.quantitySelector}>
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  ...styles.quantityButton,
                  opacity: quantity <= 1 ? 0.5 : 1,
                  cursor: quantity <= 1 ? 'not-allowed' : 'pointer'
                }}
                disabled={quantity <= 1}
                aria-label="Diminuisci quantità"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                style={styles.quantityInput}
                aria-label="Quantità"
              />
              <button
                type="button"
                onClick={() => setQuantity(Math.min(99, quantity + 1))}
                style={{
                  ...styles.quantityButton,
                  opacity: quantity >= 99 ? 0.5 : 1,
                  cursor: quantity >= 99 ? 'not-allowed' : 'pointer'
                }}
                disabled={quantity >= 99}
                aria-label="Aumenta quantità"
              >
                +
              </button>
            </div>
          </div>

          {/* Note */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Note speciali (opzionale)
              <span style={styles.labelHint}>
                {quantity > 1
                  ? `Le stesse note verranno applicate a tutti i ${quantity} prodotti. Per note diverse, aggiungi i prodotti separatamente.`
                  : 'es. "senza lattosio", "caffè lungo", ecc.'
                }
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
              placeholder="Aggiungi note per questo prodotto..."
              rows={3}
              maxLength={200}
            />
            <div style={styles.charCount}>
              {notes.length}/200
            </div>
          </div>

          {/* Subtotal */}
          <div style={styles.subtotalSection}>
            <span style={styles.subtotalLabel}>Subtotale</span>
            <span style={styles.subtotalAmount}>
              €{(finalPrice * quantity).toFixed(2)}
            </span>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={handleClose}
              style={styles.cancelButton}
            >
              Annulla
            </button>
            <button
              type="submit"
              style={styles.addButton}
            >
              Aggiungi al carrello
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const getStyles = (theme = {}) => ({
  modalContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    animation: 'fadeIn 0.2s ease',
    overflowY: 'auto'
  },
  modal: {
    backgroundColor: theme.secondaryColor || '#fff',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    position: 'relative',
    margin: 'auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${theme.borderColor || '#e0e0e0'}`,
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '22px',
    cursor: 'pointer',
    color: theme.textTertiaryColor || '#666',
    padding: '0',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s'
  },
  body: {
    padding: '16px 20px',
    overflowY: 'auto',
    flex: 1
  },
  productInfo: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: theme.secondaryColor || '#fff',
    borderRadius: '8px',
    border: `1px solid ${theme.borderColor || '#e0e0e0'}`
  },
  productImage: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '6px',
    flexShrink: 0
  },
  productName: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000'
  },
  productDescription: {
    margin: '0 0 4px 0',
    fontSize: '13px',
    color: theme.textTertiaryColor || '#666',
    lineHeight: '1.3'
  },
  productPrice: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#333'
  },
  labelHint: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '400',
    color: theme.textTertiaryColor || '#999',
    marginTop: '2px'
  },
  quantitySelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    justifyContent: 'center'
  },
  quantityButton: {
    width: '40px',
    height: '40px',
    border: `2px solid ${theme.textSecondaryColor || '#000'}`,
    borderRadius: '10px',
    backgroundColor: theme.secondaryColor || '#fff',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    color: theme.textSecondaryColor || '#000',
    lineHeight: 1
  },
  quantityInput: {
    width: '60px',
    height: '40px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '600',
    border: `2px solid ${theme.borderColor || '#e0e0e0'}`,
    borderRadius: '10px',
    outline: 'none',
    color: theme.textSecondaryColor || '#000',
    backgroundColor: theme.secondaryColor || '#fff'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    fontSize: '13px',
    border: `1px solid ${theme.borderColor || '#ddd'}`,
    borderRadius: '8px',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    minHeight: '60px',
    backgroundColor: theme.secondaryColor || '#fff',
    color: theme.textSecondaryColor || '#000'
  },
  charCount: {
    textAlign: 'right',
    fontSize: '11px',
    color: theme.textTertiaryColor || '#999',
    marginTop: '4px'
  },
  subtotalSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: theme.secondaryColor || '#fff',
    borderRadius: '8px',
    marginBottom: '16px',
    border: `1px solid ${theme.borderColor || '#e0e0e0'}`
  },
  subtotalLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: theme.textTertiaryColor || '#666'
  },
  subtotalAmount: {
    fontSize: '18px',
    fontWeight: '700',
    color: theme.textSecondaryColor || '#000'
  },
  actions: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '10px'
  },
  cancelButton: {
    padding: '12px',
    backgroundColor: 'transparent',
    color: theme.textTertiaryColor || '#666',
    border: `1px solid ${theme.borderColor || '#ddd'}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  addButton: {
    padding: '12px',
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  variantsSection: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: theme.backgroundTertiary || '#f9f9f9',
    borderRadius: '12px',
    border: `1px solid ${theme.borderColor || '#e0e0e0'}`
  },
  variantsSectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000'
  },
  optionGroup: {
    marginBottom: '16px'
  },
  optionLabel: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: theme.textSecondaryColor || '#333'
  },
  optionValues: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  optionButton: {
    padding: '8px 16px',
    backgroundColor: theme.secondaryColor || '#fff',
    color: theme.textSecondaryColor || '#333',
    border: `2px solid ${theme.borderColor || '#ddd'}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none'
  },
  optionButtonSelected: {
    backgroundColor: theme.primaryColor || '#000',
    color: theme.textPrimaryColor || '#fff',
    borderColor: theme.primaryColor || '#000'
  },
  variantInfo: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: theme.secondaryColor || '#fff',
    borderRadius: '8px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  variantInfoLabel: {
    fontWeight: '500',
    color: theme.textTertiaryColor || '#666'
  },
  variantInfoValue: {
    fontWeight: '600',
    color: theme.textSecondaryColor || '#000'
  }
})

// Aggiungi animazioni
if (typeof document !== 'undefined') {
  const styleId = 'add-to-cart-modal-animations'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(40px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `
    document.head.appendChild(style)
  }
}

export default AddToCartModal
