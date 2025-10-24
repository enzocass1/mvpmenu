import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function ConversionFunnel() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('last7days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const [funnelData, setFunnelData] = useState({
    views: 0,
    favorites: 0,
    cartAdds: 0,
    orders: 0
  })

  const [previousFunnelData, setPreviousFunnelData] = useState({
    views: 0,
    favorites: 0,
    cartAdds: 0,
    orders: 0
  })

  const [productBreakdown, setProductBreakdown] = useState([])

  // Drill-down modal state
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [hourlyData, setHourlyData] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [yearlyData, setYearlyData] = useState([])

  // Prova prima da location.state, poi da localStorage
  let restaurant = location.state?.restaurant
  if (!restaurant) {
    const stored = localStorage.getItem('analytics_restaurant')
    if (stored) {
      try {
        restaurant = JSON.parse(stored)
      } catch (error) {
        console.error('Errore parsing restaurant da localStorage:', error)
        restaurant = null
      }
    }
  }

  // Se non c'è un ristorante, reindirizza alla dashboard
  if (!restaurant) {
    navigate('/dashboard')
    return null
  }

  useEffect(() => {
    loadFunnelData()
  }, [timeRange, customStartDate, customEndDate])

  const getDateRange = () => {
    const now = new Date()
    let startDate, endDate

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        endDate = new Date()
        break
      case 'yesterday':
        startDate = new Date(now.setDate(now.getDate() - 1))
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'last7days':
        startDate = new Date(now.setDate(now.getDate() - 7))
        endDate = new Date()
        break
      case 'last30days':
        startDate = new Date(now.setDate(now.getDate() - 30))
        endDate = new Date()
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        } else {
          return null
        }
        break
      default:
        startDate = new Date(now.setDate(now.getDate() - 7))
        endDate = new Date()
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }
  }

  const loadFunnelData = async () => {
    setLoading(true)

    try {
      const dateRange = getDateRange()
      if (!dateRange) {
        setLoading(false)
        return
      }

      const { startDate, endDate } = dateRange

      // 1. Prodotti visti (product_viewed)
      const { data: viewsData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('event_type', 'product_viewed')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // 2. Prodotti preferiti (favorite_added)
      const { data: favoritesData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('event_type', 'favorite_added')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // 3. Prodotti aggiunti al carrello (order_item_added)
      const { data: cartData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('event_type', 'order_item_added')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // 4. Ordini completati (order_completed)
      const { data: ordersData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('event_type', 'order_completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      setFunnelData({
        views: viewsData?.length || 0,
        favorites: favoritesData?.length || 0,
        cartAdds: cartData?.length || 0,
        orders: ordersData?.length || 0
      })

      // Carica dati periodo precedente per comparazione
      const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
      const previousStartDate = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString()
      const previousEndDate = startDate

      const [prevViews, prevFavorites, prevCart, prevOrders] = await Promise.all([
        supabase.from('analytics_events').select('*').eq('restaurant_id', restaurant.id).eq('event_type', 'product_viewed').gte('created_at', previousStartDate).lt('created_at', previousEndDate),
        supabase.from('analytics_events').select('*').eq('restaurant_id', restaurant.id).eq('event_type', 'favorite_added').gte('created_at', previousStartDate).lt('created_at', previousEndDate),
        supabase.from('analytics_events').select('*').eq('restaurant_id', restaurant.id).eq('event_type', 'order_item_added').gte('created_at', previousStartDate).lt('created_at', previousEndDate),
        supabase.from('analytics_events').select('*').eq('restaurant_id', restaurant.id).eq('event_type', 'order_completed').gte('created_at', previousStartDate).lt('created_at', previousEndDate)
      ])

      setPreviousFunnelData({
        views: prevViews.data?.length || 0,
        favorites: prevFavorites.data?.length || 0,
        cartAdds: prevCart.data?.length || 0,
        orders: prevOrders.data?.length || 0
      })

      // Calcola breakdown per prodotto
      await loadProductBreakdown(startDate, endDate, viewsData, favoritesData, cartData, ordersData)

    } catch (error) {
      console.error('Errore caricamento funnel:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProductBreakdown = async (startDate, endDate, viewsData, favoritesData, cartData, ordersData) => {
    try {
      // Raggruppa eventi per prodotto
      const productMap = new Map()

      // Views
      viewsData?.forEach(event => {
        if (event.product_id) {
          if (!productMap.has(event.product_id)) {
            productMap.set(event.product_id, { views: 0, favorites: 0, cartAdds: 0, orders: 0 })
          }
          productMap.get(event.product_id).views++
        }
      })

      // Favorites
      favoritesData?.forEach(event => {
        if (event.product_id) {
          if (!productMap.has(event.product_id)) {
            productMap.set(event.product_id, { views: 0, favorites: 0, cartAdds: 0, orders: 0 })
          }
          productMap.get(event.product_id).favorites++
        }
      })

      // Cart Adds
      cartData?.forEach(event => {
        const productId = event.metadata?.product_id
        if (productId) {
          if (!productMap.has(productId)) {
            productMap.set(productId, { views: 0, favorites: 0, cartAdds: 0, orders: 0 })
          }
          productMap.get(productId).cartAdds++
        }
      })

      // Orders - conta quante volte il prodotto è stato ordinato
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, orders!inner(created_at)')
        .eq('orders.restaurant_id', restaurant.id)
        .gte('orders.created_at', startDate)
        .lte('orders.created_at', endDate)

      orderItems?.forEach(item => {
        if (item.product_id) {
          if (!productMap.has(item.product_id)) {
            productMap.set(item.product_id, { views: 0, favorites: 0, cartAdds: 0, orders: 0 })
          }
          productMap.get(item.product_id).orders++
        }
      })

      // Carica nomi prodotti
      const productIds = Array.from(productMap.keys())
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price')
          .in('id', productIds)

        const breakdown = products?.map(product => {
          const stats = productMap.get(product.id) || { views: 0, favorites: 0, cartAdds: 0, orders: 0 }
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            ...stats,
            viewToFavorite: stats.views > 0 ? ((stats.favorites / stats.views) * 100).toFixed(1) : 0,
            viewToCart: stats.views > 0 ? ((stats.cartAdds / stats.views) * 100).toFixed(1) : 0,
            cartToOrder: stats.cartAdds > 0 ? ((stats.orders / stats.cartAdds) * 100).toFixed(1) : 0,
            viewToOrder: stats.views > 0 ? ((stats.orders / stats.views) * 100).toFixed(1) : 0
          }
        }) || []

        // Ordina per numero di visualizzazioni
        breakdown.sort((a, b) => b.views - a.views)
        setProductBreakdown(breakdown.slice(0, 10)) // Top 10
      }

    } catch (error) {
      console.error('Errore caricamento breakdown:', error)
    }
  }

  const calculateConversion = (from, to) => {
    if (from === 0) return '0.0'
    return ((to / from) * 100).toFixed(1)
  }

  const getFunnelSteps = () => {
    const { views, favorites, cartAdds, orders } = funnelData

    return [
      {
        label: 'Visualizzazioni Prodotto',
        count: views,
        percentage: 100,
        color: '#E3F2FD'
      },
      {
        label: 'Aggiunti ai Preferiti',
        count: favorites,
        percentage: parseFloat(calculateConversion(views, favorites)),
        color: '#BBDEFB',
        conversionFrom: 'views'
      },
      {
        label: 'Aggiunti al Carrello',
        count: cartAdds,
        percentage: parseFloat(calculateConversion(views, cartAdds)),
        color: '#90CAF9',
        conversionFrom: 'views'
      },
      {
        label: 'Ordini Completati',
        count: orders,
        percentage: parseFloat(calculateConversion(views, orders)),
        color: '#42A5F5',
        conversionFrom: 'cart'
      }
    ]
  }

  const formatNumber = (num) => {
    return num.toLocaleString('it-IT')
  }

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const ComparisonBadge = ({ current, previous }) => {
    const growth = calculateGrowth(current, previous)

    if (growth === 0) {
      return (
        <span style={{ fontSize: '12px', color: '#999', fontWeight: '600' }}>
          → 0% vs periodo precedente
        </span>
      )
    }

    const color = growth > 0 ? '#10B981' : '#EF4444'
    const icon = growth > 0 ? '↑' : '↓'

    return (
      <span style={{ fontSize: '12px', color: color, fontWeight: '600' }}>
        {icon} {Math.abs(growth).toFixed(1)}% vs periodo precedente
      </span>
    )
  }

  const handleProductClick = async (product) => {
    setSelectedProduct(product)
    setDrillDownLoading(true)
    setHourlyData([])
    setDailyData([])
    setMonthlyData([])
    setYearlyData([])

    try {
      const dateRange = getDateRange()
      if (!dateRange) return

      const { startDate, endDate } = dateRange

      // Carica tutti gli eventi per questo prodotto
      const { data: events } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .or(`product_id.eq.${product.id},metadata->>product_id.eq.${product.id}`)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      // Analisi per fascia oraria (0-23)
      const hourCounts = {}
      for (let i = 0; i < 24; i++) {
        hourCounts[i] = { views: 0, favorites: 0, cartAdds: 0, orders: 0 }
      }

      // Analisi per giorno della settimana
      const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
      const dayCounts = {}
      dayNames.forEach(day => {
        dayCounts[day] = { views: 0, favorites: 0, cartAdds: 0, orders: 0 }
      })

      // Analisi per mese
      const monthCounts = {}

      // Analisi per anno
      const yearCounts = {}

      events?.forEach(event => {
        const date = new Date(event.created_at)
        const hour = date.getHours()
        const dayIndex = date.getDay()
        const dayName = dayNames[dayIndex]
        const month = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
        const year = date.getFullYear().toString()

        // Count by type
        const type = event.event_type
        let eventCategory = 'views'
        if (type === 'favorite_added') eventCategory = 'favorites'
        else if (type === 'order_item_added') eventCategory = 'cartAdds'
        else if (type === 'order_completed') eventCategory = 'orders'

        // Hourly
        hourCounts[hour][eventCategory]++

        // Daily
        dayCounts[dayName][eventCategory]++

        // Monthly
        if (!monthCounts[month]) {
          monthCounts[month] = { views: 0, favorites: 0, cartAdds: 0, orders: 0 }
        }
        monthCounts[month][eventCategory]++

        // Yearly
        if (!yearCounts[year]) {
          yearCounts[year] = { views: 0, favorites: 0, cartAdds: 0, orders: 0 }
        }
        yearCounts[year][eventCategory]++
      })

      // Convert to chart data
      const hourlyChartData = Object.entries(hourCounts).map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        ...data
      }))

      const dailyChartData = dayNames.map(day => ({
        day: day.substring(0, 3),
        ...dayCounts[day]
      }))

      const monthlyChartData = Object.entries(monthCounts).map(([month, data]) => ({
        month,
        ...data
      }))

      const yearlyChartData = Object.entries(yearCounts).map(([year, data]) => ({
        year,
        ...data
      }))

      setHourlyData(hourlyChartData)
      setDailyData(dailyChartData)
      setMonthlyData(monthlyChartData)
      setYearlyData(yearlyChartData)

    } catch (error) {
      console.error('Errore caricamento drill-down:', error)
    } finally {
      setDrillDownLoading(false)
    }
  }

  const closeDrillDown = () => {
    setSelectedProduct(null)
    setHourlyData([])
    setDailyData([])
    setMonthlyData([])
    setYearlyData([])
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate('/analytics-selection', { state: { restaurant } })}
          style={styles.backButton}
        >
          ← Analytics
        </button>
        <h1 style={styles.title}>Funnel Conversione</h1>
        <p style={styles.subtitle}>
          Analizza il percorso dei clienti: Vista → Preferito → Carrello → Ordine
        </p>
      </div>

      {/* Filtro Periodo */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Periodo</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={styles.select}
          >
            <option value="today">Oggi</option>
            <option value="yesterday">Ieri</option>
            <option value="last7days">Ultimi 7 giorni</option>
            <option value="last30days">Ultimi 30 giorni</option>
            <option value="custom">Personalizzato</option>
          </select>
        </div>

        {timeRange === 'custom' && (
          <>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Data Inizio</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Data Fine</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div style={styles.loading}>Caricamento...</div>
      ) : (
        <>
          {/* Funnel Visualization */}
          <div style={styles.funnelContainer}>
            <h2 style={styles.sectionTitle}>Panoramica Funnel</h2>
            <div style={styles.funnel}>
              {getFunnelSteps().map((step, index) => (
                <div key={index} style={styles.funnelStep}>
                  <div style={{
                    ...styles.funnelBar,
                    width: `${step.percentage}%`,
                    backgroundColor: step.color
                  }}>
                    <div style={styles.funnelBarContent}>
                      <span style={styles.funnelLabel}>{step.label}</span>
                      <span style={styles.funnelCount}>{formatNumber(step.count)}</span>
                    </div>
                  </div>
                  {index > 0 && (
                    <div style={styles.conversionRate}>
                      {step.percentage.toFixed(1)}% conversione
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Metriche Chiave */}
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Vista → Preferito</div>
                <div style={styles.metricValue}>
                  {calculateConversion(funnelData.views, funnelData.favorites)}%
                </div>
                <div style={{ marginTop: '8px' }}>
                  <ComparisonBadge current={funnelData.favorites} previous={previousFunnelData.favorites} />
                </div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Vista → Carrello</div>
                <div style={styles.metricValue}>
                  {calculateConversion(funnelData.views, funnelData.cartAdds)}%
                </div>
                <div style={{ marginTop: '8px' }}>
                  <ComparisonBadge current={funnelData.cartAdds} previous={previousFunnelData.cartAdds} />
                </div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Carrello → Ordine</div>
                <div style={styles.metricValue}>
                  {calculateConversion(funnelData.cartAdds, funnelData.orders)}%
                </div>
                <div style={{ marginTop: '8px' }}>
                  <ComparisonBadge current={funnelData.orders} previous={previousFunnelData.orders} />
                </div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Vista → Ordine (Overall)</div>
                <div style={styles.metricValue}>
                  {calculateConversion(funnelData.views, funnelData.orders)}%
                </div>
                <div style={{ marginTop: '8px' }}>
                  <ComparisonBadge current={funnelData.views} previous={previousFunnelData.views} />
                </div>
              </div>
            </div>
          </div>

          {/* Product Breakdown */}
          {productBreakdown.length > 0 && (
            <div style={styles.tableContainer}>
              <h2 style={styles.sectionTitle}>Top 10 Prodotti - Breakdown Conversione</h2>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Prodotto</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Viste</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Preferiti</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Carrello</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Ordini</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Vista → Ordine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productBreakdown.map((product) => (
                      <tr
                        key={product.id}
                        style={{...styles.tr, cursor: 'pointer'}}
                        onClick={() => handleProductClick(product)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={styles.td}>
                          <div style={styles.productName}>{product.name}</div>
                          <div style={styles.productPrice}>€{product.price.toFixed(2)}</div>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>{product.views}</td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          {product.favorites}
                          <span style={styles.conversionBadge}>{product.viewToFavorite}%</span>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          {product.cartAdds}
                          <span style={styles.conversionBadge}>{product.viewToCart}%</span>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          {product.orders}
                          <span style={styles.conversionBadge}>{product.cartToOrder}%</span>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          <strong style={{color: '#000'}}>{product.viewToOrder}%</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Drill-Down Prodotto */}
      {selectedProduct && (
        <>
          <div style={styles.modalOverlay} onClick={closeDrillDown} />
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>{selectedProduct.name}</h2>
                <p style={styles.modalSubtitle}>
                  Analisi funnel per fascia oraria, giorno, mese e anno
                </p>
              </div>
              <button onClick={closeDrillDown} style={styles.closeButton}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {drillDownLoading ? (
                <div style={styles.modalLoading}>Caricamento dati...</div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div style={styles.modalStatsGrid}>
                    <div style={styles.modalStatCard}>
                      <div style={styles.modalStatLabel}>Viste Totali</div>
                      <div style={styles.modalStatValue}>{formatNumber(selectedProduct.views)}</div>
                    </div>
                    <div style={styles.modalStatCard}>
                      <div style={styles.modalStatLabel}>Preferiti</div>
                      <div style={styles.modalStatValue}>{formatNumber(selectedProduct.favorites)}</div>
                    </div>
                    <div style={styles.modalStatCard}>
                      <div style={styles.modalStatLabel}>Aggiunti al Carrello</div>
                      <div style={styles.modalStatValue}>{formatNumber(selectedProduct.cartAdds)}</div>
                    </div>
                    <div style={styles.modalStatCard}>
                      <div style={styles.modalStatLabel}>Ordini</div>
                      <div style={styles.modalStatValue}>{formatNumber(selectedProduct.orders)}</div>
                    </div>
                  </div>

                  {/* Grafico Fascia Oraria */}
                  <div style={styles.chartSection}>
                    <h3 style={styles.chartSectionTitle}>Distribuzione per Fascia Oraria</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis dataKey="hour" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
                        <Bar dataKey="views" fill="#E3F2FD" name="Viste" stackId="a" />
                        <Bar dataKey="favorites" fill="#BBDEFB" name="Preferiti" stackId="a" />
                        <Bar dataKey="cartAdds" fill="#90CAF9" name="Carrello" stackId="a" />
                        <Bar dataKey="orders" fill="#42A5F5" name="Ordini" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Grafico Giorno Settimana */}
                  <div style={styles.chartSection}>
                    <h3 style={styles.chartSectionTitle}>Distribuzione per Giorno della Settimana</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis dataKey="day" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
                        <Bar dataKey="views" fill="#E3F2FD" name="Viste" stackId="a" />
                        <Bar dataKey="favorites" fill="#BBDEFB" name="Preferiti" stackId="a" />
                        <Bar dataKey="cartAdds" fill="#90CAF9" name="Carrello" stackId="a" />
                        <Bar dataKey="orders" fill="#42A5F5" name="Ordini" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Grafico Mensile */}
                  {monthlyData.length > 0 && (
                    <div style={styles.chartSection}>
                      <h3 style={styles.chartSectionTitle}>Distribuzione per Mese</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                          <XAxis dataKey="month" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={80} />
                          <YAxis style={{ fontSize: '12px' }} />
                          <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
                          <Bar dataKey="views" fill="#E3F2FD" name="Viste" stackId="a" />
                          <Bar dataKey="favorites" fill="#BBDEFB" name="Preferiti" stackId="a" />
                          <Bar dataKey="cartAdds" fill="#90CAF9" name="Carrello" stackId="a" />
                          <Bar dataKey="orders" fill="#42A5F5" name="Ordini" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Grafico Annuale */}
                  {yearlyData.length > 0 && (
                    <div style={styles.chartSection}>
                      <h3 style={styles.chartSectionTitle}>Distribuzione per Anno</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={yearlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                          <XAxis dataKey="year" style={{ fontSize: '12px' }} />
                          <YAxis style={{ fontSize: '12px' }} />
                          <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
                          <Bar dataKey="views" fill="#E3F2FD" name="Viste" stackId="a" />
                          <Bar dataKey="favorites" fill="#BBDEFB" name="Preferiti" stackId="a" />
                          <Bar dataKey="cartAdds" fill="#90CAF9" name="Carrello" stackId="a" />
                          <Bar dataKey="orders" fill="#42A5F5" name="Ordini" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
  },

  header: {
    maxWidth: '1200px',
    margin: '0 auto 40px auto',
  },

  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: '#666',
    cursor: 'pointer',
    padding: '8px 0',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '500',
    transition: 'color 0.2s ease',
    outline: 'none'
  },

  title: {
    fontSize: '24px',
    fontWeight: '400',
    color: '#000000',
    margin: '0 0 12px 0',
  },

  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: '1.6',
  },

  filtersContainer: {
    maxWidth: '1200px',
    margin: '0 auto 32px auto',
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  filterLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#000'
  },

  select: {
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    color: '#000',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '180px'
  },

  dateInput: {
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    color: '#000',
    outline: 'none'
  },

  loading: {
    maxWidth: '1200px',
    margin: '60px auto',
    textAlign: 'center',
    fontSize: '16px',
    color: '#666'
  },

  funnelContainer: {
    maxWidth: '1200px',
    margin: '0 auto 40px auto',
    background: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '32px'
  },

  sectionTitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#000',
    margin: '0 0 24px 0'
  },

  funnel: {
    marginBottom: '32px'
  },

  funnelStep: {
    marginBottom: '16px'
  },

  funnelBar: {
    height: '60px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    transition: 'all 0.3s ease',
    minWidth: '200px'
  },

  funnelBarContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },

  funnelLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#000'
  },

  funnelCount: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000'
  },

  conversionRate: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
    marginLeft: '20px'
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },

  metricCard: {
    background: '#F5F5F5',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center'
  },

  metricLabel: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '8px'
  },

  metricValue: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#000'
  },

  tableContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '32px'
  },

  tableWrapper: {
    overflowX: 'auto'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },

  th: {
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
    textAlign: 'left',
    borderBottom: '1px solid #E0E0E0'
  },

  tr: {
    borderBottom: '1px solid #F5F5F5',
    transition: 'background 0.2s ease'
  },

  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#000'
  },

  productName: {
    fontWeight: '500',
    marginBottom: '4px'
  },

  productPrice: {
    fontSize: '12px',
    color: '#666'
  },

  conversionBadge: {
    marginLeft: '8px',
    fontSize: '11px',
    color: '#666',
    background: '#F5F5F5',
    padding: '2px 6px',
    borderRadius: '4px'
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 999
  },

  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#FFFFFF',
    borderRadius: '12px',
    maxWidth: '1000px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },

  modalHeader: {
    padding: '24px 32px',
    borderBottom: '1px solid #E0E0E0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'sticky',
    top: 0,
    background: '#FFFFFF',
    zIndex: 1
  },

  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },

  modalSubtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: '1.5'
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#666',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    outline: 'none'
  },

  modalBody: {
    padding: '32px'
  },

  modalLoading: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '16px',
    color: '#666'
  },

  modalStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  },

  modalStatCard: {
    background: '#F5F5F5',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center'
  },

  modalStatLabel: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '8px',
    fontWeight: '500'
  },

  modalStatValue: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000'
  },

  chartSection: {
    marginBottom: '32px'
  },

  chartSectionTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#000',
    margin: '0 0 16px 0'
  }
}

export default ConversionFunnel
