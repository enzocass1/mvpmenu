import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { TIME_RANGE_OPTIONS, COMPARISON_TYPES, getDateRangeFromTimeRange } from '../utils/analytics'

function TimeBasedAnalysis() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('last30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [viewMode, setViewMode] = useState('hourly') // hourly, daily, monthly

  // Comparison settings
  const [comparisonType, setComparisonType] = useState(COMPARISON_TYPES.PREVIOUS_PERIOD)
  const [customComparisonStart, setCustomComparisonStart] = useState('')
  const [customComparisonEnd, setCustomComparisonEnd] = useState('')

  const [timeData, setTimeData] = useState([])
  const [sortBy, setSortBy] = useState('timePeriod') // timePeriod, orders, quantity, revenue
  const [sortDirection, setSortDirection] = useState('asc') // asc, desc
  const [totalStats, setTotalStats] = useState({
    totalOrders: 0,
    totalQuantity: 0,
    totalRevenue: 0
  })
  const [previousStats, setPreviousStats] = useState({
    totalOrders: 0,
    totalQuantity: 0,
    totalRevenue: 0
  })

  // Drill-down modal
  const [selectedTime, setSelectedTime] = useState(null)
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [productData, setProductData] = useState([])

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
    loadTimeData()
  }, [timeRange, customStartDate, customEndDate, viewMode, comparisonType, customComparisonStart, customComparisonEnd])

  const loadTimeData = async () => {
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

      // Query per periodo corrente
      const currentResult = await supabase
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
        .gte('orders.created_at', startDate)
        .lte('orders.created_at', endDate)

      // Query per periodo precedente (se necessario)
      let previousResult = { data: [] }
      if (previousStartDate && previousEndDate) {
        previousResult = await supabase
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
          .gte('orders.created_at', previousStartDate)
          .lte('orders.created_at', previousEndDate)
      }

      if (currentResult.error) throw currentResult.error
      const orderItems = currentResult.data

      // Raggruppa per periodo temporale
      const timeCounts = {}

      orderItems?.forEach(item => {
        if (item.product_name === '⚡ Ordine Prioritario') return

        const date = new Date(item.orders.created_at)
        let timeKey

        if (viewMode === 'hourly') {
          timeKey = `${date.getHours().toString().padStart(2, '0')}:00`
        } else if (viewMode === 'daily') {
          const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
          timeKey = dayNames[date.getDay()]
        } else if (viewMode === 'monthly') {
          timeKey = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
        }

        if (!timeCounts[timeKey]) {
          timeCounts[timeKey] = {
            timePeriod: timeKey,
            orders: new Set(),
            quantity: 0,
            revenue: 0
          }
        }

        timeCounts[timeKey].orders.add(item.order_id)
        timeCounts[timeKey].quantity += item.quantity
        timeCounts[timeKey].revenue += item.subtotal || 0
      })

      // Converti in array e conta ordini
      let dataArray = Object.values(timeCounts).map(item => ({
        ...item,
        orders: item.orders.size
      }))

      // Calcola statistiche totali periodo corrente
      const currentOrders = new Set(orderItems?.filter(item => item.product_name !== '⚡ Ordine Prioritario').map(item => item.order_id))
      const currentQuantity = orderItems?.filter(item => item.product_name !== '⚡ Ordine Prioritario').reduce((sum, item) => sum + item.quantity, 0) || 0
      const currentRevenue = orderItems?.filter(item => item.product_name !== '⚡ Ordine Prioritario').reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0

      setTotalStats({
        totalOrders: currentOrders.size,
        totalQuantity: currentQuantity,
        totalRevenue: currentRevenue
      })

      // Calcola statistiche periodo precedente
      const previousOrderItems = previousResult.data || []
      const prevOrders = new Set(previousOrderItems.filter(item => item.product_name !== '⚡ Ordine Prioritario').map(item => item.order_id))
      const prevQuantity = previousOrderItems.filter(item => item.product_name !== '⚡ Ordine Prioritario').reduce((sum, item) => sum + item.quantity, 0)
      const prevRevenue = previousOrderItems.filter(item => item.product_name !== '⚡ Ordine Prioritario').reduce((sum, item) => sum + (item.subtotal || 0), 0)

      setPreviousStats({
        totalOrders: prevOrders.size,
        totalQuantity: prevQuantity,
        totalRevenue: prevRevenue
      })

      // Ordina i dati
      dataArray = sortData(dataArray, sortBy, sortDirection)

      setTimeData(dataArray)

    } catch (error) {
      console.error('Errore caricamento time analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortData = (data, column, direction) => {
    return [...data].sort((a, b) => {
      let aVal = a[column]
      let bVal = b[column]

      if (column === 'timePeriod') {
        // Per l'ordinamento temporale, usiamo l'ordine naturale
        if (viewMode === 'hourly') {
          aVal = parseInt(a[column].split(':')[0])
          bVal = parseInt(b[column].split(':')[0])
        }
      }

      if (direction === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('desc')
    }

    setTimeData(sortData(timeData, column, sortDirection === 'asc' ? 'desc' : 'asc'))
  }

  const handleTimeClick = async (timeItem) => {
    setSelectedTime(timeItem)
    setDrillDownLoading(true)
    setProductData([])

    try {
      const dateRange = getDateRange()
      if (!dateRange) return

      const { startDate, endDate } = dateRange

      // Carica order_items per questo periodo
      const { data: orderItems } = await supabase
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

      // Filtra per periodo temporale
      const filteredItems = orderItems?.filter(item => {
        const date = new Date(item.orders.created_at)
        let timeKey

        if (viewMode === 'hourly') {
          timeKey = `${date.getHours().toString().padStart(2, '0')}:00`
        } else if (viewMode === 'daily') {
          const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
          timeKey = dayNames[date.getDay()]
        } else if (viewMode === 'monthly') {
          timeKey = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
        }

        return timeKey === timeItem.timePeriod && item.product_name !== '⚡ Ordine Prioritario'
      })

      // Raggruppa per prodotto
      const productMap = new Map()

      filteredItems?.forEach(item => {
        const productId = item.product_id || item.product_name

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            name: item.product_name,
            quantity: 0,
            revenue: 0,
            orders: new Set()
          })
        }

        const product = productMap.get(productId)
        product.quantity += item.quantity
        product.revenue += item.subtotal || 0
        product.orders.add(item.order_id)
      })

      const products = Array.from(productMap.values())
        .map(p => ({ ...p, orders: p.orders.size }))
        .sort((a, b) => b.quantity - a.quantity)

      setProductData(products)

    } catch (error) {
      console.error('Errore caricamento drill-down:', error)
    } finally {
      setDrillDownLoading(false)
    }
  }

  const closeDrillDown = () => {
    setSelectedTime(null)
    setProductData([])
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
        <h1 style={styles.title}>Analisi Temporale</h1>
        <p style={styles.subtitle}>
          Analisi vendite per fascia oraria, giorno e mese con drill-down prodotti
        </p>
      </div>

      {/* Filtri */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Vista</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            style={styles.select}
          >
            <option value="hourly">Per Ora</option>
            <option value="daily">Per Giorno</option>
            <option value="monthly">Per Mese</option>
          </select>
        </div>

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
          {/* Statistiche Totali */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Ordini Totali</div>
              <div style={styles.statValue}>{formatNumber(totalStats.totalOrders)}</div>
              <ComparisonBadge current={totalStats.totalOrders} previous={previousStats.totalOrders} />
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Prodotti Venduti</div>
              <div style={styles.statValue}>{formatNumber(totalStats.totalQuantity)}</div>
              <ComparisonBadge current={totalStats.totalQuantity} previous={previousStats.totalQuantity} />
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Revenue Totale</div>
              <div style={styles.statValue}>{formatCurrency(totalStats.totalRevenue)}</div>
              <ComparisonBadge current={totalStats.totalRevenue} previous={previousStats.totalRevenue} />
            </div>
          </div>

          {/* Tabella con Sorting */}
          {timeData.length > 0 && (
            <div style={styles.tableContainer}>
              <h2 style={styles.sectionTitle}>
                Analisi {viewMode === 'hourly' ? 'Oraria' : viewMode === 'daily' ? 'Giornaliera' : 'Mensile'}
              </h2>
              <p style={styles.helperText}>Clicca su una riga per vedere i prodotti venduti nel periodo. Clicca sulle colonne per ordinare.</p>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th
                        style={{...styles.th, cursor: 'pointer'}}
                        onClick={() => handleSort('timePeriod')}
                      >
                        {viewMode === 'hourly' ? 'Fascia Oraria' : viewMode === 'daily' ? 'Giorno' : 'Mese'} {getSortIcon('timePeriod')}
                      </th>
                      <th
                        style={{...styles.th, textAlign: 'right', cursor: 'pointer'}}
                        onClick={() => handleSort('orders')}
                      >
                        N° Ordini {getSortIcon('orders')}
                      </th>
                      <th
                        style={{...styles.th, textAlign: 'right', cursor: 'pointer'}}
                        onClick={() => handleSort('quantity')}
                      >
                        Quantità Prodotti {getSortIcon('quantity')}
                      </th>
                      <th
                        style={{...styles.th, textAlign: 'right', cursor: 'pointer'}}
                        onClick={() => handleSort('revenue')}
                      >
                        Revenue {getSortIcon('revenue')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeData.map((item, index) => (
                      <tr
                        key={index}
                        style={{...styles.tr, cursor: 'pointer'}}
                        onClick={() => handleTimeClick(item)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={styles.td}>
                          <strong>{item.timePeriod}</strong>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                          {formatNumber(item.orders)}
                        </td>
                        <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                          {formatNumber(item.quantity)}
                        </td>
                        <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                          {formatCurrency(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {timeData.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>Nessun dato disponibile per questo periodo</p>
            </div>
          )}
        </>
      )}

      {/* Modal Drill-Down Prodotti */}
      {selectedTime && (
        <>
          <div style={styles.modalOverlay} onClick={closeDrillDown} />
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Prodotti venduti: {selectedTime.timePeriod}</h2>
                <p style={styles.modalSubtitle}>
                  {formatNumber(selectedTime.orders)} ordini • {formatNumber(selectedTime.quantity)} prodotti • {formatCurrency(selectedTime.revenue)}
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
                  {productData.length > 0 ? (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>#</th>
                            <th style={styles.th}>Prodotto</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Quantità</th>
                            <th style={{...styles.th, textAlign: 'right'}}>N° Ordini</th>
                            <th style={{...styles.th, textAlign: 'right'}}>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productData.map((product, index) => (
                            <tr key={index} style={styles.tr}>
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
                              <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                                {formatNumber(product.quantity)}
                              </td>
                              <td style={{...styles.td, textAlign: 'right'}}>
                                {formatNumber(product.orders)}
                              </td>
                              <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                                {formatCurrency(product.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={styles.emptyText}>Nessun prodotto venduto in questo periodo</div>
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
    textAlign: 'center'
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
    maxWidth: '900px',
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
  }
}

export default TimeBasedAnalysis
