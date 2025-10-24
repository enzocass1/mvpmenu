import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TIME_RANGE_OPTIONS, COMPARISON_TYPES, getDateRangeFromTimeRange } from '../utils/analytics'

function RevenueAnalytics() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('last30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Comparison settings
  const [comparisonType, setComparisonType] = useState(COMPARISON_TYPES.PREVIOUS_PERIOD)
  const [customComparisonStart, setCustomComparisonStart] = useState('')
  const [customComparisonEnd, setCustomComparisonEnd] = useState('')

  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    avgOrderValue: 0,
    totalOrders: 0,
    revenueGrowth: 0
  })

  const [previousData, setPreviousData] = useState({
    totalRevenue: 0,
    avgOrderValue: 0,
    totalOrders: 0
  })

  const [timeSeriesData, setTimeSeriesData] = useState([])
  const [hourlyData, setHourlyData] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [topRevenueProducts, setTopRevenueProducts] = useState([])

  // Drill-down modal state
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [productHourlyData, setProductHourlyData] = useState([])
  const [productDailyData, setProductDailyData] = useState([])
  const [productMonthlyData, setProductMonthlyData] = useState([])
  const [productYearlyData, setProductYearlyData] = useState([])

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
    loadRevenueData()
  }, [timeRange, customStartDate, customEndDate, comparisonType, customComparisonStart, customComparisonEnd])

  const loadRevenueData = async () => {
    setLoading(true)

    try {
      const dateRange = getDateRangeFromTimeRange(timeRange, customStartDate, customEndDate)
      if (!dateRange) {
        setLoading(false)
        return
      }

      const { startDate, endDate } = dateRange

      // Calcola periodo di confronto in base al tipo selezionato
      let previousStartDate, previousEndDate

      if (comparisonType === COMPARISON_TYPES.NONE) {
        previousStartDate = null
        previousEndDate = null
      } else if (comparisonType === COMPARISON_TYPES.CUSTOM) {
        if (customComparisonStart && customComparisonEnd) {
          previousStartDate = new Date(customComparisonStart).toISOString()
          previousEndDate = new Date(customComparisonEnd)
          previousEndDate.setHours(23, 59, 59, 999)
          previousEndDate = previousEndDate.toISOString()
        } else {
          previousStartDate = null
          previousEndDate = null
        }
      } else if (comparisonType === COMPARISON_TYPES.PREVIOUS_YEAR) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        start.setFullYear(start.getFullYear() - 1)
        end.setFullYear(end.getFullYear() - 1)
        previousStartDate = start.toISOString()
        previousEndDate = end.toISOString()
      } else {
        const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
        const prevStart = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000)
        previousStartDate = prevStart.toISOString()
        previousEndDate = startDate
      }

      // Query per tutti gli ordini nel periodo corrente
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true })

      if (ordersError) throw ordersError

      // Query per order_items per analisi per prodotto
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          orders!inner(
            id,
            restaurant_id,
            created_at,
            total_amount,
            is_priority_order
          )
        `)
        .eq('orders.restaurant_id', restaurant.id)
        .gte('orders.created_at', startDate)
        .lte('orders.created_at', endDate)

      if (itemsError) throw itemsError

      // Calcola metriche totali
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const totalOrders = orders?.length || 0
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Query per periodo precedente (se necessario)
      let previousOrders = []
      if (previousStartDate && previousEndDate) {
        const { data } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', previousStartDate)
          .lte('created_at', previousEndDate)
        previousOrders = data || []
      }

      const previousRevenue = previousOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const previousTotalOrders = previousOrders?.length || 0
      const previousAvgOrderValue = previousTotalOrders > 0 ? previousRevenue / previousTotalOrders : 0
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

      setPreviousData({
        totalRevenue: previousRevenue,
        avgOrderValue: previousAvgOrderValue,
        totalOrders: previousTotalOrders
      })

      setRevenueData({
        totalRevenue,
        avgOrderValue,
        totalOrders,
        revenueGrowth
      })

      // Time Series Data (per giorno)
      const dailyRevenue = {}
      orders?.forEach(order => {
        const date = new Date(order.created_at)
        const dateKey = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })

        if (!dailyRevenue[dateKey]) {
          dailyRevenue[dateKey] = { date: dateKey, revenue: 0, orders: 0 }
        }

        dailyRevenue[dateKey].revenue += order.total_amount || 0
        dailyRevenue[dateKey].orders++
      })

      setTimeSeriesData(Object.values(dailyRevenue))

      // Analisi per fascia oraria
      const hourRevenue = {}
      for (let i = 0; i < 24; i++) {
        hourRevenue[i] = { hour: `${i.toString().padStart(2, '0')}:00`, revenue: 0, orders: 0 }
      }

      orders?.forEach(order => {
        const date = new Date(order.created_at)
        const hour = date.getHours()
        hourRevenue[hour].revenue += order.total_amount || 0
        hourRevenue[hour].orders++
      })

      setHourlyData(Object.values(hourRevenue))

      // Top 10 prodotti per revenue
      const productRevenue = new Map()

      orderItems?.forEach(item => {
        if (item.product_name === '⚡ Ordine Prioritario') return

        const productId = item.product_id || item.product_name

        if (!productRevenue.has(productId)) {
          productRevenue.set(productId, {
            name: item.product_name,
            revenue: 0,
            quantity: 0
          })
        }

        const product = productRevenue.get(productId)
        product.revenue += item.subtotal || 0
        product.quantity += item.quantity
      })

      const topProducts = Array.from(productRevenue.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      setTopRevenueProducts(topProducts)

      // Category breakdown - raggruppa per categoria se disponibile
      // Per ora usiamo una classificazione semplice basata su Priority Orders e prodotti
      const priorityRevenue = orderItems
        ?.filter(item => item.product_name === '⚡ Ordine Prioritario')
        .reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0

      const productsRevenue = totalRevenue - priorityRevenue

      const breakdown = [
        { name: 'Prodotti', value: productsRevenue },
        { name: 'Ordini Prioritari', value: priorityRevenue }
      ].filter(item => item.value > 0)

      setCategoryBreakdown(breakdown)

    } catch (error) {
      console.error('Errore caricamento revenue analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const formatNumber = (num) => {
    return num.toLocaleString('it-IT')
  }

  const COLORS = ['#000000', '#666666', '#999999', '#CCCCCC']

  const handleProductClick = async (product) => {
    setSelectedProduct(product)
    setDrillDownLoading(true)
    setProductHourlyData([])
    setProductDailyData([])
    setProductMonthlyData([])
    setProductYearlyData([])

    try {
      const dateRange = getDateRangeFromTimeRange(timeRange, customStartDate, customEndDate)
      if (!dateRange) return

      const { startDate, endDate } = dateRange

      // Carica tutti gli order_items per questo prodotto
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          *,
          orders!inner(
            id,
            restaurant_id,
            created_at,
            total_amount
          )
        `)
        .eq('orders.restaurant_id', restaurant.id)
        .eq('product_name', product.name)
        .gte('orders.created_at', startDate)
        .lte('orders.created_at', endDate)

      // Analisi per fascia oraria
      const hourCounts = {}
      for (let i = 0; i < 24; i++) {
        hourCounts[i] = { revenue: 0, quantity: 0 }
      }

      const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
      const dayCounts = {}
      dayNames.forEach(day => {
        dayCounts[day] = { revenue: 0, quantity: 0 }
      })

      // Analisi per mese
      const monthCounts = {}

      // Analisi per anno
      const yearCounts = {}

      orderItems?.forEach(item => {
        const date = new Date(item.orders.created_at)
        const hour = date.getHours()
        const dayIndex = date.getDay()
        const dayName = dayNames[dayIndex]
        const month = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
        const year = date.getFullYear().toString()

        const revenue = item.subtotal || 0
        const quantity = item.quantity

        // Hourly
        hourCounts[hour].revenue += revenue
        hourCounts[hour].quantity += quantity

        // Daily
        dayCounts[dayName].revenue += revenue
        dayCounts[dayName].quantity += quantity

        // Monthly
        if (!monthCounts[month]) {
          monthCounts[month] = { revenue: 0, quantity: 0 }
        }
        monthCounts[month].revenue += revenue
        monthCounts[month].quantity += quantity

        // Yearly
        if (!yearCounts[year]) {
          yearCounts[year] = { revenue: 0, quantity: 0 }
        }
        yearCounts[year].revenue += revenue
        yearCounts[year].quantity += quantity
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

      setProductHourlyData(hourlyChartData)
      setProductDailyData(dailyChartData)
      setProductMonthlyData(monthlyChartData)
      setProductYearlyData(yearlyChartData)

    } catch (error) {
      console.error('Errore caricamento drill-down:', error)
    } finally {
      setDrillDownLoading(false)
    }
  }

  const closeDrillDown = () => {
    setSelectedProduct(null)
    setProductHourlyData([])
    setProductDailyData([])
    setProductMonthlyData([])
    setProductYearlyData([])
  }

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const ComparisonBadge = ({ current, previous }) => {
    const growth = calculateGrowth(current, previous)
    if (growth === 0) {
      return <span style={{ fontSize: '12px', color: '#999', fontWeight: '600' }}>→ 0% vs periodo precedente</span>
    }
    const color = growth > 0 ? '#10B981' : '#EF4444'
    const icon = growth > 0 ? '↑' : '↓'
    return <span style={{ fontSize: '12px', color: color, fontWeight: '600' }}>{icon} {Math.abs(growth).toFixed(1)}% vs periodo precedente</span>
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
        <h1 style={styles.title}>Revenue Analytics</h1>
        <p style={styles.subtitle}>
          Analisi dettagliata dei ricavi, trend temporali e breakdown per prodotto
        </p>
      </div>

      {/* Filtri */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Periodo</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={styles.select}
          >
            {TIME_RANGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {timeRange === 'custom' && (
          <>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Data inizio</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Data fine</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          </>
        )}

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Confronta con</label>
          <select
            value={comparisonType}
            onChange={(e) => setComparisonType(e.target.value)}
            style={styles.select}
          >
            <option value={COMPARISON_TYPES.PREVIOUS_PERIOD}>Periodo precedente</option>
            <option value={COMPARISON_TYPES.PREVIOUS_YEAR}>Stesso periodo anno scorso</option>
            <option value={COMPARISON_TYPES.CUSTOM}>Periodo personalizzato</option>
            <option value={COMPARISON_TYPES.NONE}>Nessun confronto</option>
          </select>
        </div>

        {comparisonType === COMPARISON_TYPES.CUSTOM && (
          <>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Confronto: Data inizio</label>
              <input
                type="date"
                value={customComparisonStart}
                onChange={(e) => setCustomComparisonStart(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Confronto: Data fine</label>
              <input
                type="date"
                value={customComparisonEnd}
                onChange={(e) => setCustomComparisonEnd(e.target.value)}
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
          {/* KPI Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Revenue Totale</div>
              <div style={styles.statValue}>{formatCurrency(revenueData.totalRevenue)}</div>
              <ComparisonBadge current={revenueData.totalRevenue} previous={previousData.totalRevenue} />
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Valore Medio Ordine (AOV)</div>
              <div style={styles.statValue}>{formatCurrency(revenueData.avgOrderValue)}</div>
              <ComparisonBadge current={revenueData.avgOrderValue} previous={previousData.avgOrderValue} />
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Ordini Totali</div>
              <div style={styles.statValue}>{formatNumber(revenueData.totalOrders)}</div>
              <ComparisonBadge current={revenueData.totalOrders} previous={previousData.totalOrders} />
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Revenue per Ordine</div>
              <div style={styles.statValue}>{formatCurrency(revenueData.avgOrderValue)}</div>
              <ComparisonBadge current={revenueData.avgOrderValue} previous={previousData.avgOrderValue} />
            </div>
          </div>

          {/* Time Series - Revenue Trend */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Trend Revenue nel Tempo</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis
                  dataKey="date"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'revenue') return [formatCurrency(value), 'Revenue']
                    if (name === 'orders') return [formatNumber(value), 'Ordini']
                    return value
                  }}
                  contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={{ fill: '#000000', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Charts Container */}
          <div style={styles.chartsContainer}>
            {/* Hourly Revenue */}
            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>Revenue per Fascia Oraria</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="hour" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }}
                  />
                  <Bar dataKey="revenue" fill="#000000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div style={styles.chartCard}>
                <h2 style={styles.chartTitle}>Breakdown Revenue per Categoria</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Products by Revenue Table */}
          {topRevenueProducts.length > 0 && (
            <div style={styles.tableContainer}>
              <h2 style={styles.sectionTitle}>Top 10 Prodotti per Revenue</h2>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Prodotto</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Quantità Venduta</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Revenue Totale</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Revenue Medio/Unità</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRevenueProducts.map((product, index) => (
                      <tr
                        key={index}
                        style={{...styles.tr, cursor: 'pointer'}}
                        onClick={() => handleProductClick(product)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={styles.td}>
                          <span style={{
                            ...styles.rankBadge,
                            ...(index < 3 ? styles.topRank : {})
                          }}>
                            {index + 1}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.productName}>{product.name}</div>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          {formatNumber(product.quantity)}
                        </td>
                        <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                          {formatCurrency(product.revenue)}
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          {formatCurrency(product.revenue / product.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {revenueData.totalOrders === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>Nessun ordine in questo periodo</p>
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
                  Analisi revenue per fascia oraria, giorno, mese e anno
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
                      <div style={styles.modalStatLabel}>Revenue Totale</div>
                      <div style={styles.modalStatValue}>{formatCurrency(selectedProduct.revenue)}</div>
                    </div>
                    <div style={styles.modalStatCard}>
                      <div style={styles.modalStatLabel}>Quantità Venduta</div>
                      <div style={styles.modalStatValue}>{formatNumber(selectedProduct.quantity)}</div>
                    </div>
                    <div style={styles.modalStatCard}>
                      <div style={styles.modalStatLabel}>Revenue Medio/Unità</div>
                      <div style={styles.modalStatValue}>{formatCurrency(selectedProduct.revenue / selectedProduct.quantity)}</div>
                    </div>
                  </div>

                  {/* Grafico Fascia Oraria */}
                  <div style={styles.chartSection}>
                    <h3 style={styles.chartSectionTitle}>Revenue per Fascia Oraria</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={productHourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis dataKey="hour" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }}
                        />
                        <Bar dataKey="revenue" fill="#000000" name="Revenue" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Grafico Giorno Settimana */}
                  <div style={styles.chartSection}>
                    <h3 style={styles.chartSectionTitle}>Revenue per Giorno della Settimana</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={productDailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis dataKey="day" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }}
                        />
                        <Bar dataKey="revenue" fill="#000000" name="Revenue" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Grafico Mensile */}
                  {productMonthlyData.length > 0 && (
                    <div style={styles.chartSection}>
                      <h3 style={styles.chartSectionTitle}>Revenue per Mese</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={productMonthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                          <XAxis dataKey="month" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={80} />
                          <YAxis style={{ fontSize: '12px' }} />
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }}
                          />
                          <Bar dataKey="revenue" fill="#000000" name="Revenue" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Grafico Annuale */}
                  {productYearlyData.length > 0 && (
                    <div style={styles.chartSection}>
                      <h3 style={styles.chartSectionTitle}>Revenue per Anno</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={productYearlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                          <XAxis dataKey="year" style={{ fontSize: '12px' }} />
                          <YAxis style={{ fontSize: '12px' }} />
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }}
                          />
                          <Bar dataKey="revenue" fill="#000000" name="Revenue" radius={[4, 4, 0, 0]} />
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

  statsGrid: {
    maxWidth: '1200px',
    margin: '0 auto 32px auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },

  statCard: {
    background: '#F5F5F5',
    borderRadius: '8px',
    padding: '24px',
  },

  statLabel: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '8px',
    fontWeight: '500'
  },

  statValue: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '8px'
  },

  statHelper: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px'
  },

  chartCard: {
    maxWidth: '1200px',
    margin: '0 auto 32px auto',
    background: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '24px'
  },

  chartsContainer: {
    maxWidth: '1200px',
    margin: '0 auto 32px auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '24px'
  },

  chartTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#000',
    marginBottom: '20px',
    margin: '0 0 20px 0'
  },

  tableContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
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
    borderBottom: '2px solid #E0E0E0',
    whiteSpace: 'nowrap'
  },

  tr: {
    borderBottom: '1px solid #F5F5F5'
  },

  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#000'
  },

  rankBadge: {
    display: 'inline-block',
    minWidth: '32px',
    padding: '4px 8px',
    background: '#E0E0E0',
    color: '#666',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'center'
  },

  topRank: {
    background: '#000000',
    color: '#FFFFFF'
  },

  productName: {
    fontWeight: '500',
    color: '#000'
  },

  emptyState: {
    maxWidth: '1200px',
    margin: '60px auto',
    textAlign: 'center',
    padding: '60px 20px',
    background: '#F5F5F5',
    borderRadius: '8px'
  },

  emptyText: {
    fontSize: '16px',
    color: '#666',
    margin: 0
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

export default RevenueAnalytics
