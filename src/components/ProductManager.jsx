import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ImageUpload from './ImageUpload'
import VariantManager from './VariantManager'
import {
  checkPremiumAccess,
  canAddItem,
  FREE_LIMITS
} from '../utils/subscription'

function ProductManager({ restaurantId, restaurant, layout = 'grid' }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showVariantManager, setShowVariantManager] = useState(null)
  const [variantCounts, setVariantCounts] = useState({})
  const [variantTitles, setVariantTitles] = useState({})
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  const [rowMenu, setRowMenu] = useState(null) // { product, top, right } menu azioni riga

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    image_url: '',
    category_id: '',
  })

  useEffect(() => {
    if (restaurantId) {
      loadData()
    }
  }, [restaurantId])

  const loadData = async () => {
    // Load categories
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order', { ascending: true })

    if (categoriesData) {
      setCategories(categoriesData)
    }

    // Load all products for this restaurant through categories
    if (categoriesData && categoriesData.length > 0) {
      const categoryIds = categoriesData.map(cat => cat.id)
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .in('category_id', categoryIds)
        .order('name', { ascending: true })

      if (productsData) {
        setProducts(productsData)

        // Carica varianti (conteggi + titoli) in una sola query
        const prodIds = productsData.map(p => p.id)
        const counts = {}
        const titles = {}
        if (prodIds.length > 0) {
          const { data: allVars } = await supabase
            .from('v_product_variants')
            .select('product_id, title, position')
            .in('product_id', prodIds)
            .order('position', { ascending: true })
          ;(allVars || []).forEach(v => {
            counts[v.product_id] = (counts[v.product_id] || 0) + 1
            ;(titles[v.product_id] = titles[v.product_id] || []).push(v.title)
          })
        }
        setVariantCounts(counts)
        setVariantTitles(titles)
      }
    }
  }

  const loadProducts = loadData // Alias for backward compatibility

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.category_id) {
      alert('Seleziona una categoria')
      return
    }

    setLoading(true)

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            cost: parseFloat(formData.cost) || 0,
            image_url: formData.image_url,
            category_id: formData.category_id,
          })
          .eq('id', editingProduct.id)

        if (error) throw error
        alert('Prodotto aggiornato!')
      } else {
        const maxOrder = products.length > 0 ? Math.max(...products.map(p => p.order)) : -1

        const { error } = await supabase
          .from('products')
          .insert([
            {
              category_id: formData.category_id,
              name: formData.name,
              description: formData.description,
              price: parseFloat(formData.price),
              cost: parseFloat(formData.cost) || 0,
              image_url: formData.image_url,
              order: maxOrder + 1,
              is_visible: true,
            }
          ])

        if (error) throw error
        alert('Prodotto creato!')
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      cost: (product.cost ?? 0).toString(),
      image_url: product.image_url || '',
      category_id: product.category_id || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (productId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo prodotto?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      alert('Prodotto eliminato!')
      await loadData()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  const toggleVisibility = async (product) => {
    try {
      const newVisibility = !product.is_visible

      const { error } = await supabase
        .from('products')
        .update({ is_visible: newVisibility })
        .eq('id', product.id)

      if (error) throw error

      if (!newVisibility) {
        const productsToUpdate = products
          .filter(p => p.order > product.order)
          .map(p => ({ id: p.id, order: p.order - 1 }))

        for (const prod of productsToUpdate) {
          await supabase
            .from('products')
            .update({ order: prod.order })
            .eq('id', prod.id)
        }

        await supabase
          .from('products')
          .update({ order: products.length - 1 })
          .eq('id', product.id)
      } else {
        const visibleCount = products.filter(p => p.is_visible).length
        await supabase
          .from('products')
          .update({ order: visibleCount })
          .eq('id', product.id)
      }


      await loadData()
    } catch (error) {
      console.error('Error toggling visibility:', error)
      alert('Errore durante l\'aggiornamento della visibilità')
    }
  }

  // I 4 pulsanti azione: Modifica, Visibilità, Varianti, Elimina.
  // iconsOnly = solo icone (per le righe); horizontal = 4 in fila (desktop) o 2x2 (mobile).
  const ActionButtons = ({ product, iconsOnly, horizontal }) => {
    const container = iconsOnly
      ? (horizontal
          ? { display: 'flex', gap: '6px' }
          : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' })
      : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }
    const btn = iconsOnly
      ? { width: '34px', height: '34px', padding: 0 }
      : { padding: '10px', fontSize: '13px', fontWeight: '500', gap: '6px' }
    const base = { borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', ...btn }
    return (
      <div style={container}>
        <button onClick={() => handleEdit(product)} title="Modifica" style={{ ...base, color: '#FFFFFF', background: '#000000', border: 'none' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
            <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
          </svg>
          {!iconsOnly && 'Modifica'}
        </button>
        <button onClick={() => toggleVisibility(product)} title={product.is_visible === false ? 'Mostra' : 'Nascondi'} style={{ ...base, color: '#000000', background: '#FFFFFF', border: '1px solid #E0E0E0' }}>
          {product.is_visible === false ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/></svg>
          )}
        </button>
        <button onClick={() => setShowVariantManager(product)} title="Gestisci Varianti" style={{ ...base, color: '#FFFFFF', background: '#2196F3', border: 'none' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/><path d="M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4z"/></svg>
          {!iconsOnly && 'Varianti'}
        </button>
        <button onClick={() => handleDelete(product.id)} title="Elimina" style={{ ...base, color: '#FFFFFF', background: '#f44336', border: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
        </button>
      </div>
    )
  }

  // Una RIGA prodotto compatta (stile e-commerce) — layout === 'rows'
  const ProductRow = ({ product }) => {
    const categoryName = getCategoryName(product.category_id)
    const vCount = variantCounts[product.id] || 0
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderBottom: '1px solid #F0F0F0', opacity: product.is_visible === false ? 0.6 : 1 }}>
        <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '8px', border: '1px solid #E0E0E0', background: product.image_url ? `url(${product.image_url})` : '#F5F5F5', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.name}
            {product.is_visible === false && <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 700, color: '#FFFFFF', background: '#FF9800', borderRadius: '4px', padding: '1px 5px', textTransform: 'uppercase' }}>Nascosto</span>}
          </div>
          <div style={{ fontSize: '11px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {categoryName} · €{Number(product.price || 0).toFixed(2)}
          </div>
          {vCount > 0 && (
            <div style={{ fontSize: '11px', color: '#2196F3', fontWeight: 600 }}>
              {vCount} {vCount === 1 ? 'variante' : 'varianti'}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setRowMenu({ product, top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) }) }}
          title="Azioni"
          style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #000000', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5px' }}>
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#000000' }} />
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#000000' }} />
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#000000' }} />
          </span>
        </button>
      </div>
    )
  }

  // Voce del menu azioni (icona + etichetta colorata)
  const RowMenuItem = ({ color, label, onClick, children }) => (
    <button
      onClick={() => { setRowMenu(null); onClick() }}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', color, fontSize: '14px', fontWeight: 500, textAlign: 'left' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F5' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
      {label}
    </button>
  )

  // Menu azioni a tendina (⋮) per le righe
  const RowMenu = () => {
    if (!rowMenu) return null
    const product = rowMenu.product
    return (
      <>
        <div onClick={() => setRowMenu(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1500 }} />
        <div style={{ position: 'fixed', top: rowMenu.top, right: rowMenu.right, zIndex: 1501, background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', boxShadow: '0 8px 28px rgba(0,0,0,0.16)', minWidth: '200px', padding: '6px' }}>
          <RowMenuItem color="#000000" label="Modifica" onClick={() => handleEdit(product)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>
          </RowMenuItem>
          <RowMenuItem color="#000000" label={product.is_visible === false ? 'Mostra' : 'Nascondi'} onClick={() => toggleVisibility(product)}>
            {product.is_visible === false ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/></svg>
            )}
          </RowMenuItem>
          <RowMenuItem color="#2196F3" label="Varianti" onClick={() => setShowVariantManager(product)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/><path d="M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4z"/></svg>
          </RowMenuItem>
          <div style={{ height: '1px', background: '#F0F0F0', margin: '4px 8px' }} />
          <RowMenuItem color="#f44336" label="Elimina" onClick={() => handleDelete(product.id)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
          </RowMenuItem>
        </div>
      </>
    )
  }

  const moveProduct = async (productId, direction) => {
    const currentIndex = products.findIndex(p => p.id === productId)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === products.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const newProducts = [...products]
    const [movedProduct] = newProducts.splice(currentIndex, 1)
    newProducts.splice(newIndex, 0, movedProduct)

    const updates = newProducts.map((product, index) => ({
      id: product.id,
      order: index,
    }))

    try {
      for (const update of updates) {
        await supabase
          .from('products')
          .update({ order: update.order })
          .eq('id', update.id)
      }
      await loadData()
    } catch (error) {
      console.error('Error reordering products:', error)
      alert('Errore durante il riordinamento')
    }
  }

  const resetForm = () => {
    setShowModal(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      cost: '',
      image_url: '',
      category_id: '',
    })
  }

  const handleCreateClick = () => {
    setShowModal(true)
  }

  const { hasValidAccess } = restaurant ? checkPremiumAccess(restaurant) : { hasValidAccess: false }

  // Get category name for a product
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId)
    return category ? category.name : 'Senza categoria'
  }

  // Prodotti mostrati = filtro categoria + ricerca live per nome
  const displayedProducts = products
    .filter(p => selectedCategory === 'all' || p.category_id === selectedCategory)
    .filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))

  return (
    <>
      {/* Modal for Create/Edit Product */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
              <h3 style={{
                margin: '0 0 24px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: '#000000'
              }}>
                {editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Categoria *
                </label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                >
                  <option value="">Seleziona categoria</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Nome Prodotto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Es: Margherita"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Descrizione
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione opzionale"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Prezzo di vendita (€, IVA inclusa) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Es: 8.50"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Costo prodotto (€, IVA inclusa)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="Es: 2.50 — quanto ti costa"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#000000',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                {formData.price && formData.cost && parseFloat(formData.price) > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#16A34A' }}>
                    Margine: €{(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)}
                    {' '}({Math.round((1 - parseFloat(formData.cost) / parseFloat(formData.price)) * 100)}%)
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Immagine Prodotto
                </label>
                <ImageUpload
                  currentImageUrl={formData.image_url}
                  onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                  folder="products"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    background: loading ? '#999999' : '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  {loading ? 'Salvando...' : (editingProduct ? 'Aggiorna' : 'Crea')}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#666',
                    background: '#F5F5F5',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div>
        {restaurant && layout !== 'rows' && (
          <div style={{
            padding: '16px',
            background: hasValidAccess ? '#E8F5E9' : '#FFF3E0',
            border: `1px solid ${hasValidAccess ? '#C8E6C9' : '#FFE0B2'}`,
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#000000',
                  marginBottom: '4px'
                }}>
                  Prodotti: <strong>{products.length}</strong>
                  {hasValidAccess && ' (Illimitati)'}
                </div>
              </div>

              <button
                onClick={handleCreateClick}
                title="Nuovo Prodotto"
                style={{
                  padding: layout === 'rows' ? '10px' : '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  background: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {layout === 'rows'
                  ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>
                  : '+ Nuovo Prodotto'}
              </button>
            </div>
          </div>
        )}

        {/* Vista RIGHE: toolbar con 3 pulsanti (Aggiungi, Cerca, Filtra) + ricerca a scomparsa */}
        {products.length > 0 && layout === 'rows' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreateClick}
                style={{ flex: 1, padding: '11px', fontSize: '14px', fontWeight: 600, color: '#FFFFFF', background: '#000000', border: '1px solid #000000', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', lineHeight: 1 }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>
                Aggiungi
              </button>
              <button
                onClick={() => setShowSearch(v => !v)}
                title="Cerca"
                style={{ flex: 1, padding: '11px', fontSize: '14px', fontWeight: 600, color: showSearch ? '#FFFFFF' : '#000000', background: showSearch ? '#000000' : '#FFFFFF', border: '1px solid #000000', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', lineHeight: 1 }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>
                Cerca
              </button>
              <button
                onClick={() => setShowCategoryFilter(true)}
                title="Filtra per categorie"
                style={{ flex: 1, padding: '11px', fontSize: '14px', fontWeight: 600, color: '#000000', background: '#FFFFFF', border: '1px solid #000000', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', lineHeight: 1 }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5z"/></svg>
                Filtra
              </button>
            </div>
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca un prodotto…"
                autoFocus
                style={{ width: '100%', marginTop: '8px', padding: '12px 14px', fontSize: '14px', border: '1px solid #E0E0E0', borderRadius: '8px', background: '#FFFFFF', color: '#000000', boxSizing: 'border-box', outline: 'none' }}
              />
            )}
          </div>
        )}

        {/* Vista GRIGLIA: filtro categorie + ricerca */}
        {products.length > 0 && layout !== 'rows' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => setShowCategoryFilter(true)}
                style={{ width: '100%', padding: '10px 16px', fontSize: '14px', fontWeight: '500', color: '#000000', background: '#FFFFFF', border: '1px solid #000000', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.target.style.background = '#000000'; e.target.style.color = '#FFFFFF' }}
                onMouseLeave={(e) => { e.target.style.background = '#FFFFFF'; e.target.style.color = '#000000' }}
              >
                Filtra per categorie
              </button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca un prodotto…"
                style={{ width: '100%', padding: '12px 14px', fontSize: '14px', border: '1px solid #E0E0E0', borderRadius: '8px', background: '#FFFFFF', color: '#000000', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          </>
        )}

        {products.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            border: '2px dashed #E0E0E0',
            borderRadius: '12px',
            background: '#FAFAFA'
          }}>
            <p style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '500',
              color: '#666666'
            }}>
              Nessun prodotto creato
            </p>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '14px',
              color: '#999999'
            }}>
              {categories.length === 0 ? 'Crea prima una categoria dalla tab Categorie' : 'Clicca su "+ Nuovo Prodotto" per iniziare'}
            </p>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#999999',
            border: '2px dashed #E0E0E0',
            borderRadius: '12px',
            background: '#FAFAFA'
          }}>
            Nessun prodotto trovato{searchQuery.trim() ? ` per "${searchQuery.trim()}"` : ''}.
          </div>
        ) : layout === 'rows' ? (
          <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', overflow: 'hidden' }}>
            {displayedProducts.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {displayedProducts
              .map((product) => {
              const variantCount = variantCounts[product.id] || 0
              const categoryName = getCategoryName(product.category_id)

              return (
                <div
                  key={product.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E0E0E0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    opacity: product.is_visible === false ? 0.6 : 1,
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Product Image */}
                  <div style={{
                    width: '100%',
                    height: '180px',
                    background: product.image_url ? `url(${product.image_url})` : '#F5F5F5',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {!product.image_url && (
                      <span style={{
                        fontSize: '14px',
                        color: '#999999',
                        fontWeight: '500'
                      }}>
                        Nessuna immagine
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div style={{ padding: '16px' }}>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#000000'
                    }}>
                      {product.name}
                    </h4>

                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#000000'
                    }}>
                      €{product.price.toFixed(2)}
                    </p>

                    <div style={{
                      margin: '0 0 16px 0',
                      fontSize: '13px',
                      color: '#666666'
                    }}>
                      <div>{categoryName}</div>
                      {variantCount > 0 && (
                        <div>{variantCount} {variantCount === 1 ? 'variante' : 'varianti'}</div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <ActionButtons product={product} />
                  </div>

                  {/* Hidden Badge */}
                  {product.is_visible === false && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#FFFFFF',
                      background: '#FF9800',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Nascosto
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Variant Manager Modal */}
        {showVariantManager && (
          <VariantManager
            product={showVariantManager}
            onClose={() => setShowVariantManager(null)}
            onSave={() => {
              loadData() // Ricarica prodotti dopo modifiche varianti
            }}
          />
        )}

        {/* Menu azioni riga (⋮) */}
        <RowMenu />

        {/* Category Filter Modal */}
        {showCategoryFilter && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={() => setShowCategoryFilter(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                maxWidth: '400px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                  Filtra per categoria
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setSelectedCategory('all')
                      setShowCategoryFilter(false)
                    }}
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: selectedCategory === 'all' ? '600' : '500',
                      color: selectedCategory === 'all' ? '#FFFFFF' : '#000000',
                      background: selectedCategory === 'all' ? '#000000' : '#F5F5F5',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Tutte le categorie
                  </button>

                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id)
                        setShowCategoryFilter(false)
                      }}
                      style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: selectedCategory === cat.id ? '600' : '500',
                        color: selectedCategory === cat.id ? '#FFFFFF' : '#000000',
                        background: selectedCategory === cat.id ? '#000000' : '#F5F5F5',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCategory !== cat.id) {
                          e.target.style.background = '#E0E0E0'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCategory !== cat.id) {
                          e.target.style.background = '#F5F5F5'
                        }
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowCategoryFilter(false)}
                  style={{
                    marginTop: '20px',
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#666666',
                    background: 'transparent',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default ProductManager
