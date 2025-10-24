import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TIME_RANGE_OPTIONS, COMPARISON_TYPES, getDateRangeFromTimeRange } from '../utils/analytics'

function AOVAnalysis() {
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

  const [aovData, setAovData] = useState({
    overallAOV: 0,
    totalOrders: 0,
    totalRevenue: 0,
    avgItemsPerOrder: 0,
    avgPricePerItem: 0
  })

  const [previousAovData, setPreviousAovData] = useState({
    overallAOV: 0,
    totalOrders: 0,
    totalRevenue: 0,
    avgItemsPerOrder: 0,
    avgPricePerItem: 0
  })

  const [dailyAOV, setDailyAOV] = useState([])
  const [ordersData, setOrdersData] = useState([])
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')

  // Drill-down modal
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [orderItems, setOrderItems] = useState([])

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

  if (!restaurant) {
    navigate('/dashboard')
    return null
  }

  useEffect(() => {
    loadAOVData()
  }, [timeRange, customStartDate, customEndDate, comparisonType, customComparisonStart, customComparisonEnd])

  const loadAOVData = async () => {
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
        // Nessun confronto
        previousStartDate = null
        previousEndDate = null
      } else if (comparisonType === COMPARISON_TYPES.CUSTOM) {
        // Periodo personalizzato
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
        // Stesso periodo anno scorso
        const start = new Date(startDate)
        const end = new Date(endDate)
        start.setFullYear(start.getFullYear() - 1)
        end.setFullYear(end.getFullYear() - 1)
        previousStartDate = start.toISOString()
        previousEndDate = end.toISOString()
      } else {
        // Periodo precedente (default)
        const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
        const prevStart = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000)
        previousStartDate = prevStart.toISOString()
        previousEndDate = startDate
      }

      // Query per periodo corrente
      const currentResult = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: true }),
        supabase
          .from('order_items')
          .select(`
            *,
            orders!inner(
              id,
              restaurant_id,
              created_at
            )
          `)
          .eq('orders.restaurant_id', restaurant.id)
          .gte('orders.created_at', startDate)
          .lte('orders.created_at', endDate)
      ])

      // Query per periodo precedente (se necessario)
      let previousResult = [{ data: [] }, { data: [] }]
      if (previousStartDate && previousEndDate) {
        previousResult = await Promise.all([
          supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .gte('created_at', previousStartDate)
            .lte('created_at', previousEndDate),
          supabase
            .from('order_items')
            .select(`
              *,
              orders!inner(
                id,
                restaurant_id,
                created_at
              )
            `)
            .eq('orders.restaurant_id', restaurant.id)
            .gte('orders.created_at', previousStartDate)
            .lte('orders.created_at', previousEndDate)
        ])
      }

      const [ordersResult, itemsResult] = currentResult
      const [prevOrdersResult, prevItemsResult] = previousResult

      if (ordersResult.error) throw ordersResult.error
      if (itemsResult.error) throw itemsResult.error

      const orders = ordersResult.data
      const orderItems = itemsResult.data

      // Calcola metriche globali
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const totalOrders = orders?.length || 0
      const overallAOV = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Calcola items totali (escludi Priority Order)
      const totalItems = orderItems?.filter(item => item.product_name !== '⚡ Ordine Prioritario')
        .reduce((sum, item) => sum + item.quantity, 0) || 0

      const avgItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0

      // Calcola prezzo medio per item
      const totalProductRevenue = orderItems?.filter(item => item.product_name !== '⚡ Ordine Prioritario')
        .reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0

      const avgPricePerItem = totalItems > 0 ? totalProductRevenue / totalItems : 0

      setAovData({
        overallAOV,
        totalOrders,
        totalRevenue,
        avgItemsPerOrder,
        avgPricePerItem
      })

      // Calcola metriche periodo precedente
      const prevOrders = prevOrdersResult.data || []
      const prevOrderItems = prevItemsResult.data || []

      const prevTotalRevenue = prevOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      const prevTotalOrders = prevOrders.length
      const prevOverallAOV = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0

      const prevTotalItems = prevOrderItems.filter(item => item.product_name !== '⚡ Ordine Prioritario')
        .reduce((sum, item) => sum + item.quantity, 0)
      const prevAvgItemsPerOrder = prevTotalOrders > 0 ? prevTotalItems / prevTotalOrders : 0

      const prevTotalProductRevenue = prevOrderItems.filter(item => item.product_name !== '⚡ Ordine Prioritario')
        .reduce((sum, item) => sum + (item.subtotal || 0), 0)
      const prevAvgPricePerItem = prevTotalItems > 0 ? prevTotalProductRevenue / prevTotalItems : 0

      setPreviousAovData({
        overallAOV: prevOverallAOV,
        totalOrders: prevTotalOrders,
        totalRevenue: prevTotalRevenue,
        avgItemsPerOrder: prevAvgItemsPerOrder,
        avgPricePerItem: prevAvgPricePerItem
      })

      // AOV giornaliero
      const dailyData = {}
      orders?.forEach(order => {
        const date = new Date(order.created_at)
        const dateKey = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })

        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { date: dateKey, revenue: 0, orders: 0 }
        }

        dailyData[dateKey].revenue += order.total_amount || 0
        dailyData[dateKey].orders++
      })

      const dailyAOVData = Object.values(dailyData).map(day => ({
        ...day,
        aov: day.orders > 0 ? day.revenue / day.orders : 0
      }))

      setDailyAOV(dailyAOVData)

      // Prepara dati ordini per tabella con items count
      const ordersWithItems = orders?.map(order => {
        const items = orderItems?.filter(item => item.order_id === order.id && item.product_name !== '⚡ Ordine Prioritario') || []
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
        const avgPricePerItemInOrder = itemCount > 0 ? order.total_amount / itemCount : 0

        return {
          ...order,
          itemCount,
          avgPricePerItemInOrder
        }
      }) || []

      setOrdersData(sortData(ordersWithItems, sortBy, sortDirection))

    } catch (error) {
      console.error('Errore caricamento AOV analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortData = (data, column, direction) => {
    return [...data].sort((a, b) => {
      let aVal = a[column]
      let bVal = b[column]

      if (column === 'created_at') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }

      if (direction === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
  }

  const handleSort = (column) => {
    const newDirection = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortBy(column)
    setSortDirection(newDirection)
    setOrdersData(sortData(ordersData, column, newDirection))
  }

  const handleOrderClick = async (order) => {
    setSelectedOrder(order)
    setDrillDownLoading(true)
    setOrderItems([])

    try {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      const itemsData = items?.filter(item => item.product_name !== '⚡ Ordine Prioritario').map(item => ({
        ...item,
        pricePerUnit: item.quantity > 0 ? (item.subtotal || 0) / item.quantity : 0
      })) || []

      setOrderItems(itemsData)

    } catch (error) {
      console.error('Errore caricamento order items:', error)
    } finally {
      setDrillDownLoading(false)
    }
  }

  const closeDrillDown = () => {
    setSelectedOrder(null)
    setOrderItems([])
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const formatNumber = (num) => {
    return num.toLocaleString('it-IT', { maximumFractionDigits: 2 })
  }

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
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

  const getSortIcon = (column) => {
    if (sortBy !== column) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
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
        <h1 style={styles.title}>Analisi Valore Medio Ordine (AOV)</h1>
        <p style={styles.subtitle}>
          Valore medio ordine complessivo, per giorno e per singolo ordine
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
              <div style={styles.statLabel}>AOV Complessivo</div>
              <div style={styles.statValue}>{formatCurrency(aovData.overallAOV)}</div>
              <ComparisonBadge current={aovData.overallAOV} previous={previousAovData.overallAOV} />
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Ordini Totali</div>
              <div style={styles.statValue}>{formatNumber(aovData.totalOrders)}</div>
              <ComparisonBadge current={aovData.totalOrders} previous={previousAovData.totalOrders} />
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Media Prodotti/Ordine</div>
              <div style={styles.statValue}>{formatNumber(aovData.avgItemsPerOrder)}</div>
              <ComparisonBadge current={aovData.avgItemsPerOrder} previous={previousAovData.avgItemsPerOrder} />
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Prezzo Medio/Prodotto</div>
              <div style={styles.statValue}>{formatCurrency(aovData.avgPricePerItem)}</div>
              <ComparisonBadge current={aovData.avgPricePerItem} previous={previousAovData.avgPricePerItem} />
            </div>
          </div>

          {/* AOV Giornaliero Line Chart */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>Andamento AOV nel Tempo</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyAOV}>
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
                    if (name === 'aov') return [formatCurrency(value), 'AOV']
                    if (name === 'orders') return [formatNumber(value), 'Ordini']
                    if (name === 'revenue') return [formatCurrency(value), 'Revenue']
                    return value
                  }}
                  contentStyle={{ background: '#FFF', border: '1px solid #E0E0E0', borderRadius: '4px' }}
                />
                <Line
                  type="monotone"
                  dataKey="aov"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={{ fill: '#000000', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabella Ordini con Sorting */}
          {ordersData.length > 0 && (
            <div style={styles.tableContainer}>
              <h2 style={styles.sectionTitle}>Dettaglio Ordini</h2>
              <p style={styles.helperText}>
                Clicca su un ordine per vedere il breakdown dei prodotti e il costo medio per prodotto. Clicca sulle colonne per ordinare.
              </p>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th
                        style={{...styles.th, cursor: 'pointer'}}
                        onClick={() => handleSort('created_at')}
                      >
                        Data/Ora {getSortIcon('created_at')}
                      </th>
                      <th style={styles.th}>Tavolo</th>
                      <th
                        style={{...styles.th, textAlign: 'right', cursor: 'pointer'}}
                        onClick={() => handleSort('itemCount')}
                      >
                        N° Prodotti {getSortIcon('itemCount')}
                      </th>
                      <th
                        style={{...styles.th, textAlign: 'right', cursor: 'pointer'}}
                        onClick={() => handleSort('total_amount')}
                      >
                        Valore Ordine {getSortIcon('total_amount')}
                      </th>
                      <th
                        style={{...styles.th, textAlign: 'right', cursor: 'pointer'}}
                        onClick={() => handleSort('avgPricePerItemInOrder')}
                      >
                        Costo Medio/Prodotto {getSortIcon('avgPricePerItemInOrder')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersData.map((order) => (
                      <tr
                        key={order.id}
                        style={{...styles.tr, cursor: 'pointer'}}
                        onClick={() => handleOrderClick(order)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={styles.td}>
                          {formatDateTime(order.created_at)}
                        </td>
                        <td style={styles.td}>
                          {order.table_number || '-'}
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          {formatNumber(order.itemCount)}
                        </td>
                        <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                          {formatCurrency(order.avgPricePerItemInOrder)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {ordersData.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>Nessun ordine in questo periodo</p>
            </div>
          )}
        </>
      )}

      {/* Modal Drill-Down Ordine */}
      {selectedOrder && (
        <>
          <div style={styles.modalOverlay} onClick={closeDrillDown} />
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  Ordine #{selectedOrder.id.substring(0, 8)}
                </h2>
                <p style={styles.modalSubtitle}>
                  {formatDateTime(selectedOrder.created_at)} • Tavolo {selectedOrder.table_number || '-'}
                </p>
              </div>
              <button onClick={closeDrillDown} style={styles.closeButton}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {drillDownLoading ? (
                <div style={styles.modalLoading}>Caricamento prodotti...</div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div style={styles.modalStatsGrid}>
                    <div style={styles.modalStatCard}>
                      <div style={styles.modalStatLabel}>Valore Totale</div>
                      <div style={styles.modalStatValue}>{formatCurrency(selectedOrder.total_amount)}</div>
                    </div>
                    <div style={styles.modalStatCard}>
                      <div style={styles.modalStatLabel}>N° Prodotti</div>
                      <div style={styles.modalStatValue}>{formatNumber(selectedOrder.itemCount)}</div>
                    </div>
                    <div style={styles.modalStatCard}>
                      <div style={styles.modalStatLabel}>Costo Medio/Prodotto</div>
                      <div style={styles.modalStatValue}>{formatCurrency(selectedOrder.avgPricePerItemInOrder)}</div>
                    </div>
                  </div>

                  {/* Tabella Prodotti */}
                  {orderItems.length > 0 ? (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Prodotto</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Prezzo Unitario</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Quantità</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Subtotale</th>
                            <th style={{...styles.th, textAlign: 'right'}}>% sul Totale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderItems.map((item, index) => (
                            <tr key={index} style={styles.tr}>
                              <td style={styles.td}>
                                <div style={styles.productName}>{item.product_name}</div>
                                {item.notes && (
                                  <div style={styles.productNotes}>{item.notes}</div>
                                )}
                              </td>
                              <td style={{...styles.td, textAlign: 'right'}}>
                                {formatCurrency(item.pricePerUnit)}
                              </td>
                              <td style={{...styles.td, textAlign: 'right'}}>
                                {item.quantity}
                              </td>
                              <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                                {formatCurrency(item.subtotal)}
                              </td>
                              <td style={{...styles.td, textAlign: 'right'}}>
                                <span style={styles.percentageBadge}>
                                  {((item.subtotal / selectedOrder.total_amount) * 100).toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={styles.emptyText}>Nessun prodotto in questo ordine</div>
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
    margin: '0 0 8px 0'
  },

  helperText: {
    fontSize: '13px',
    color: '#666',
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
    whiteSpace: 'nowrap',
    userSelect: 'none'
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
    color: '#000'
  },

  productNotes: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
    fontStyle: 'italic'
  },

  percentageBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    background: '#F5F5F5',
    borderRadius: '4px',
    fontSize: '13px',
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
  }
}

export default AOVAnalysis
