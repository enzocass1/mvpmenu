import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  getEventsCountByDay,
  getEventsCountByHalfHour,
  getTopProducts,
  getTopCategories,
  getAverageSessionTime,
  getTotalEventsCount,
  EVENT_TYPES,
  COMPARISON_TYPES,
  getTopTimeSlot,
  getTopDayOfWeek,
  getFavoriteConversionRate,
  getTrend,
  getEstimatedValue,
  getBounceRate,
  getDeviceDistribution,
  getTrafficSource,
  getPopularityScore,
  getAverageProductsExplored,
  getCategoryExplorationRate,
  getCategoryStarProduct,
  getAverageViewTimeByProduct,
  getHourlyDistribution,
  getDayOfWeekDistribution,
  getSessionTimeByHour,
  getSessionTimeByDay,
  getComparison,
  getSessionTimeComparison,
  getHourlyDistributionComparison,
  getDayDistributionComparison
} from '../utils/analytics'

function AnalyticsDashboard() {
  const { metricId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Prova prima da location.state, poi da localStorage
  let restaurant = location.state?.restaurant
  if (!restaurant) {
    const stored = localStorage.getItem('analytics_restaurant')
    if (stored) {
      restaurant = JSON.parse(stored)
    }
  }

  const [timeRange, setTimeRange] = useState('last7days')
  const [showHourly, setShowHourly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState([])
  const [topItems, setTopItems] = useState([])
  const [enrichedItems, setEnrichedItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [averageTime, setAverageTime] = useState(0)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Comparison settings (stile Shopify)
  const [comparisonType, setComparisonType] = useState(COMPARISON_TYPES.PREVIOUS_PERIOD)
  const [customComparisonStart, setCustomComparisonStart] = useState('')
  const [customComparisonEnd, setCustomComparisonEnd] = useState('')

  // Toggle states for column visibility
  const [showDetailView, setShowDetailView] = useState(false)
  const [showAdvancedView, setShowAdvancedView] = useState(false)

  // Drill-down modal state
  const [drillDownItem, setDrillDownItem] = useState(null)
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [hourlyDistData, setHourlyDistData] = useState([])
  const [dayDistData, setDayDistData] = useState([])

  // Session-specific charts
  const [sessionHourlyData, setSessionHourlyData] = useState([])
  const [sessionDailyData, setSessionDailyData] = useState([])

  // Comparison data
  const [mainComparison, setMainComparison] = useState(null)
  const [drillDownHourlyComparison, setDrillDownHourlyComparison] = useState([])
  const [drillDownDailyComparison, setDrillDownDailyComparison] = useState([])

  const metricConfig = {
    favorites: {
      title: 'Prodotti Preferiti',
      color: '#000000',
      eventType: EVENT_TYPES.FAVORITE_ADDED,
      description: 'Prodotti aggiunti ai preferiti'
    },
    products: {
      title: 'Prodotti Visti',
      color: '#000000',
      eventType: EVENT_TYPES.PRODUCT_VIEWED,
      description: 'Prodotti visualizzati dai clienti'
    },
    categories: {
      title: 'Categorie Visualizzate',
      color: '#000000',
      eventType: EVENT_TYPES.CATEGORY_VIEWED,
      description: 'Categorie aperte dai clienti'
    },
    session: {
      title: 'Tempo sul Menu',
      color: '#000000',
      eventType: EVENT_TYPES.SESSION_TIME,
      description: 'Tempo medio di permanenza'
    },
    qr: {
      title: 'QR Code Scansionati',
      color: '#000000',
      eventType: EVENT_TYPES.QR_SCANNED,
      description: 'Scansioni del QR code'
    }
  }

  const config = metricConfig[metricId] || metricConfig.favorites

  const timeRangeOptions = [
    { value: 'today', label: 'Oggi' },
    { value: 'yesterday', label: 'Ieri' },
    { value: 'last7days', label: 'Ultimi 7 giorni' },
    { value: 'last15days', label: 'Ultimi 15 giorni' },
    { value: 'last30days', label: 'Ultimi 30 giorni' },
    { value: 'thisMonth', label: 'Questo mese' },
    { value: 'last3months', label: 'Ultimi 3 mesi' },
    { value: 'last6months', label: 'Ultimi 6 mesi' },
    { value: 'lastYear', label: 'Ultimo anno' },
    { value: 'custom', label: 'Personalizzato' }
  ]

  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let startDate, endDate

    switch (timeRange) {
      case 'today':
        startDate = today
        endDate = now
        break
      case 'yesterday':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 1)
        endDate = today
        break
      case 'last7days':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 7)
        endDate = now
        break
      case 'last15days':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 15)
        endDate = now
        break
      case 'last30days':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 30)
        endDate = now
        break
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = now
        break
      case 'last3months':
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 3)
        endDate = now
        break
      case 'last6months':
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 6)
        endDate = now
        break
      case 'lastYear':
        startDate = new Date(today)
        startDate.setFullYear(startDate.getFullYear() - 1)
        endDate = now
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        } else {
          startDate = new Date(today)
          startDate.setDate(startDate.getDate() - 7)
          endDate = now
        }
        break
      default:
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 7)
        endDate = now
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }
  }

  const loadAnalytics = async () => {
    if (!restaurant?.id) return

    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange()

      // Carica dati per grafici
      if (showHourly && (timeRange === 'today' || timeRange === 'yesterday')) {
        const hourlyData = await getEventsCountByHalfHour(restaurant.id, config.eventType, startDate, endDate)
        setChartData(hourlyData)
      } else {
        const dailyData = await getEventsCountByDay(restaurant.id, config.eventType, startDate, endDate)
        setChartData(dailyData.map(item => ({
          ...item,
          date: new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
        })))
      }

      // Carica totale eventi e comparazione
      const total = await getTotalEventsCount(restaurant.id, config.eventType, startDate, endDate)
      setTotalCount(total)

      // Carica comparazione principale con tipo selezionato
      const customPeriod = comparisonType === COMPARISON_TYPES.CUSTOM && customComparisonStart && customComparisonEnd
        ? { startDate: customComparisonStart, endDate: customComparisonEnd }
        : null

      let comparison
      if (metricId === 'session') {
        comparison = await getSessionTimeComparison(restaurant.id, startDate, endDate, comparisonType, customPeriod)
      } else {
        comparison = await getComparison(restaurant.id, config.eventType, null, startDate, endDate, comparisonType, customPeriod)
      }
      setMainComparison(comparison)

      // Carica top items (prodotti o categorie) con metriche avanzate
      if (metricId === 'favorites' || metricId === 'products') {
        const products = await getTopProducts(restaurant.id, config.eventType, startDate, endDate, 10)
        setTopItems(products)

        // Enriched items with advanced metrics
        const enriched = await Promise.all(products.map(async (product) => {
          const [timeSlot, dayOfWeek, conversionRate, trend, bounceRate, deviceDist, trafficSrc, popularityScore, avgViewTime] = await Promise.all([
            getTopTimeSlot(restaurant.id, config.eventType, product.productId, startDate, endDate),
            getTopDayOfWeek(restaurant.id, config.eventType, product.productId, startDate, endDate),
            getFavoriteConversionRate(restaurant.id, product.productId, startDate, endDate),
            getTrend(restaurant.id, config.eventType, product.productId, startDate, endDate),
            getBounceRate(restaurant.id, product.productId, startDate, endDate),
            getDeviceDistribution(restaurant.id, config.eventType, product.productId, startDate, endDate),
            getTrafficSource(restaurant.id, config.eventType, product.productId, startDate, endDate),
            getPopularityScore(restaurant.id, product.productId, startDate, endDate),
            getAverageViewTimeByProduct(restaurant.id, product.productId, startDate, endDate)
          ])

          return {
            ...product,
            topTimeSlot: timeSlot,
            topDayOfWeek: dayOfWeek,
            conversionRate,
            trend,
            bounceRate,
            deviceType: deviceDist,
            trafficSource: trafficSrc,
            popularityScore,
            avgViewTime,
            estimatedValue: getEstimatedValue(product.price || 0, product.count)
          }
        }))

        setEnrichedItems(enriched)

      } else if (metricId === 'categories') {
        const categories = await getTopCategories(restaurant.id, startDate, endDate, 10)
        setTopItems(categories)

        // Enriched categories with advanced metrics
        const enriched = await Promise.all(categories.map(async (category) => {
          const [timeSlot, dayOfWeek, avgProductsExplored, explorationRate, starProduct, trend] = await Promise.all([
            getTopTimeSlot(restaurant.id, EVENT_TYPES.CATEGORY_VIEWED, category.categoryId, startDate, endDate),
            getTopDayOfWeek(restaurant.id, EVENT_TYPES.CATEGORY_VIEWED, category.categoryId, startDate, endDate),
            getAverageProductsExplored(restaurant.id, category.categoryId, startDate, endDate),
            getCategoryExplorationRate(restaurant.id, category.categoryId, startDate, endDate),
            getCategoryStarProduct(restaurant.id, category.categoryId, startDate, endDate),
            getTrend(restaurant.id, EVENT_TYPES.CATEGORY_VIEWED, category.categoryId, startDate, endDate)
          ])

          return {
            ...category,
            topTimeSlot: timeSlot,
            topDayOfWeek: dayOfWeek,
            avgProductsExplored,
            explorationRate,
            starProduct,
            trend
          }
        }))

        setEnrichedItems(enriched)
      }

      // Carica tempo medio sessione
      if (metricId === 'session') {
        const avgTime = await getAverageSessionTime(restaurant.id, startDate, endDate)
        setAverageTime(avgTime)

        // Carica distribuzione oraria e giornaliera per sessioni
        const [hourlyData, dailyData] = await Promise.all([
          getSessionTimeByHour(restaurant.id, startDate, endDate),
          getSessionTimeByDay(restaurant.id, startDate, endDate)
        ])

        setSessionHourlyData(hourlyData)
        setSessionDailyData(dailyData)
      }

    } catch (error) {
      console.error('Errore caricamento analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Funzione per aprire il drill-down con dati dettagliati
  const handleDrillDown = async (item) => {
    setDrillDownItem(item)
    setDrillDownLoading(true)

    try {
      const { startDate, endDate } = getDateRange()
      const entityId = item.productId || item.categoryId

      const customPeriod = comparisonType === COMPARISON_TYPES.CUSTOM && customComparisonStart && customComparisonEnd
        ? { startDate: customComparisonStart, endDate: customComparisonEnd }
        : null

      const [hourly, daily, hourlyComp, dailyComp] = await Promise.all([
        getHourlyDistribution(restaurant.id, config.eventType, entityId, startDate, endDate),
        getDayOfWeekDistribution(restaurant.id, config.eventType, entityId, startDate, endDate),
        getHourlyDistributionComparison(restaurant.id, config.eventType, entityId, startDate, endDate, comparisonType, customPeriod),
        getDayDistributionComparison(restaurant.id, config.eventType, entityId, startDate, endDate, comparisonType, customPeriod)
      ])

      setHourlyDistData(hourly)
      setDayDistData(daily)
      setDrillDownHourlyComparison(hourlyComp)
      setDrillDownDailyComparison(dailyComp)
    } catch (error) {
      console.error('Errore caricamento drill-down:', error)
    } finally {
      setDrillDownLoading(false)
    }
  }

  const closeDrillDown = () => {
    setDrillDownItem(null)
    setHourlyDistData([])
    setDayDistData([])
  }

  useEffect(() => {
    loadAnalytics()
  }, [restaurant?.id, metricId, timeRange, showHourly, customStartDate, customEndDate, comparisonType, customComparisonStart, customComparisonEnd])

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const getTrendIcon = (trendData) => {
    if (!trendData) return '→'
    switch (trendData.trend) {
      case 'up': return '↑'
      case 'down': return '↓'
      default: return '→'
    }
  }

  const getTrendColor = (trendData) => {
    if (!trendData) return '#666'
    switch (trendData.trend) {
      case 'up': return '#4CAF50'
      case 'down': return '#f44336'
      default: return '#666'
    }
  }

  const getComparisonLabel = () => {
    switch (comparisonType) {
      case COMPARISON_TYPES.PREVIOUS_PERIOD:
        return 'vs periodo precedente'
      case COMPARISON_TYPES.PREVIOUS_YEAR:
        return 'vs stesso periodo anno scorso'
      case COMPARISON_TYPES.CUSTOM:
        return 'vs periodo personalizzato'
      case COMPARISON_TYPES.NONE:
        return ''
      default:
        return 'vs periodo precedente'
    }
  }

  // Componente badge di comparazione
  const ComparisonBadge = ({ comparison }) => {
    if (!comparison || comparison.percentage === 0) {
      return (
        <span style={{
          fontSize: '12px',
          color: '#999',
          fontWeight: '500'
        }}>
          →  0%
        </span>
      )
    }

    const color = comparison.status === 'positive' ? '#4CAF50' :
                  comparison.status === 'negative' ? '#EF5350' : '#999'
    const icon = comparison.status === 'positive' ? '↑' :
                 comparison.status === 'negative' ? '↓' : '→'

    return (
      <span style={{
        fontSize: '12px',
        color: color,
        fontWeight: '600'
      }}>
        {icon} {Math.abs(comparison.percentage)}%
      </span>
    )
  }

  if (!restaurant) {
    navigate('/dashboard')
    return null
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

        <div style={styles.titleSection}>
          <div>
            <h1 style={styles.title}>{config.title}</h1>
            <p style={styles.subtitle}>{config.description}</p>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Periodo</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={styles.select}
          >
            {timeRangeOptions.map(option => (
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

        {/* Selettore tipo di comparazione (stile Shopify) */}
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

        {/* Campi per periodo personalizzato di comparazione */}
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

        {(timeRange === 'today' || timeRange === 'yesterday') && (
          <div style={styles.filterGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showHourly}
                onChange={(e) => setShowHourly(e.target.checked)}
                style={styles.checkbox}
              />
              Visualizza per fascia oraria (30 min)
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Caricamento dati...</p>
        </div>
      ) : (
        <>
          {/* Statistiche principali */}
          <div style={styles.statsGrid}>
            <div style={{...styles.statCard, borderLeft: `4px solid ${config.color}`}}>
              <div style={styles.statLabel}>Totale</div>
              <div style={styles.statValue}>
                {metricId === 'session' ? formatTime(averageTime) : totalCount}
              </div>
              <div style={styles.statDescription}>
                {metricId === 'session' ? 'Tempo medio' : 'Eventi totali'}
              </div>
              {mainComparison && comparisonType !== COMPARISON_TYPES.NONE && (
                <div style={{ marginTop: '12px' }}>
                  <ComparisonBadge comparison={mainComparison} />
                  <span style={{ fontSize: '11px', color: '#999', marginLeft: '6px' }}>
                    {getComparisonLabel()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Grafico a linea */}
          {chartData.length > 0 && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Andamento nel tempo</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey={showHourly ? "time" : "date"}
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={config.color}
                    strokeWidth={3}
                    dot={{ fill: config.color, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Grafico a barre */}
          {chartData.length > 0 && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Distribuzione</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey={showHourly ? "time" : "date"}
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill={config.color}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Toggle Controls */}
          {(metricId === 'favorites' || metricId === 'products' || metricId === 'categories') && enrichedItems.length > 0 && (
            <div style={styles.toggleCard}>
              <h3 style={styles.toggleTitle}>Dettaglio Colonne</h3>
              <div style={styles.toggleButtons}>
                <button
                  onClick={() => setShowDetailView(!showDetailView)}
                  style={{
                    ...styles.toggleButton,
                    background: showDetailView ? '#000000' : '#FFFFFF',
                    color: showDetailView ? '#FFFFFF' : '#000000'
                  }}
                >
                  Vista Dettagliata
                </button>
                <button
                  onClick={() => setShowAdvancedView(!showAdvancedView)}
                  style={{
                    ...styles.toggleButton,
                    background: showAdvancedView ? '#000000' : '#FFFFFF',
                    color: showAdvancedView ? '#FFFFFF' : '#000000'
                  }}
                >
                  Vista Avanzata
                </button>
              </div>
            </div>
          )}

          {/* Top items con metriche avanzate */}
          {(metricId === 'favorites' || metricId === 'products') && enrichedItems.length > 0 && (
            <div style={styles.tableCard}>
              <h3 style={styles.tableTitle}>Top Prodotti (clicca per dettagli orari)</h3>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={{...styles.th, textAlign: 'left'}}>Nome</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Visualizzazioni</th>
                      <th style={{...styles.th, textAlign: 'center'}}>Fascia Oraria Top</th>

                      {showDetailView && (
                        <>
                          <th style={{...styles.th, textAlign: 'center'}}>Tempo Medio</th>
                          <th style={{...styles.th, textAlign: 'center'}}>Giorno Top</th>
                          <th style={{...styles.th, textAlign: 'right'}}>Conversione %</th>
                        </>
                      )}

                      {showAdvancedView && (
                        <>
                          <th style={{...styles.th, textAlign: 'center'}}>Trend</th>
                          <th style={{...styles.th, textAlign: 'center'}}>Device Type</th>
                          <th style={{...styles.th, textAlign: 'right'}}>Score</th>
                          <th style={{...styles.th, textAlign: 'right'}}>Valore Stimato</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedItems.map((item, index) => (
                      <tr
                        key={item.id || index}
                        style={{...styles.tr, cursor: 'pointer'}}
                        onClick={() => handleDrillDown(item)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={styles.td}>{index + 1}</td>
                        <td style={{...styles.td, fontWeight: '500', textAlign: 'left'}}>{item.name}</td>
                        <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                          {item.count}
                        </td>
                        <td style={{...styles.td, textAlign: 'center', fontSize: '13px'}}>
                          {item.topTimeSlot}
                        </td>

                        {showDetailView && (
                          <>
                            <td style={{...styles.td, textAlign: 'center'}}>
                              {formatTime(item.avgViewTime)}
                            </td>
                            <td style={{...styles.td, textAlign: 'center', fontSize: '13px'}}>
                              {item.topDayOfWeek}
                            </td>
                            <td style={{...styles.td, textAlign: 'right'}}>
                              {item.conversionRate}%
                            </td>
                          </>
                        )}

                        {showAdvancedView && (
                          <>
                            <td style={{...styles.td, textAlign: 'center', color: getTrendColor(item.trend)}}>
                              {getTrendIcon(item.trend)} {item.trend?.percentage}%
                            </td>
                            <td style={{...styles.td, textAlign: 'center', fontSize: '13px'}}>
                              {item.deviceType}
                            </td>
                            <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                              {item.popularityScore}/100
                            </td>
                            <td style={{...styles.td, textAlign: 'right'}}>
                              €{item.estimatedValue}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top categories con metriche avanzate */}
          {metricId === 'categories' && enrichedItems.length > 0 && (
            <div style={styles.tableCard}>
              <h3 style={styles.tableTitle}>Top Categorie (clicca per dettagli orari)</h3>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={{...styles.th, textAlign: 'left'}}>Nome</th>
                      <th style={{...styles.th, textAlign: 'right'}}>Visualizzazioni</th>
                      <th style={{...styles.th, textAlign: 'center'}}>Fascia Oraria Top</th>

                      {showDetailView && (
                        <>
                          <th style={{...styles.th, textAlign: 'center'}}>Prodotti Esplorati</th>
                          <th style={{...styles.th, textAlign: 'center'}}>Giorno Top</th>
                        </>
                      )}

                      {showAdvancedView && (
                        <>
                          <th style={{...styles.th, textAlign: 'right'}}>Tasso Esplorazione</th>
                          <th style={{...styles.th, textAlign: 'center'}}>Trend</th>
                          <th style={{...styles.th, textAlign: 'left'}}>Prodotto Stella</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedItems.map((item, index) => (
                      <tr
                        key={item.id || index}
                        style={{...styles.tr, cursor: 'pointer'}}
                        onClick={() => handleDrillDown(item)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={styles.td}>{index + 1}</td>
                        <td style={{...styles.td, fontWeight: '500', textAlign: 'left'}}>{item.name}</td>
                        <td style={{...styles.td, textAlign: 'right', fontWeight: '600'}}>
                          {item.count}
                        </td>
                        <td style={{...styles.td, textAlign: 'center', fontSize: '13px'}}>
                          {item.topTimeSlot}
                        </td>

                        {showDetailView && (
                          <>
                            <td style={{...styles.td, textAlign: 'center'}}>
                              {item.avgProductsExplored}
                            </td>
                            <td style={{...styles.td, textAlign: 'center', fontSize: '13px'}}>
                              {item.topDayOfWeek}
                            </td>
                          </>
                        )}

                        {showAdvancedView && (
                          <>
                            <td style={{...styles.td, textAlign: 'right'}}>
                              {item.explorationRate}%
                            </td>
                            <td style={{...styles.td, textAlign: 'center', color: getTrendColor(item.trend)}}>
                              {getTrendIcon(item.trend)} {item.trend?.percentage}%
                            </td>
                            <td style={{...styles.td, textAlign: 'left', fontSize: '13px'}}>
                              {item.starProduct || 'N/A'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grafici per sessioni: distribuzione oraria e giornaliera */}
          {metricId === 'session' && sessionHourlyData.length > 0 && (
            <>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Tempo Medio per Fascia Oraria</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sessionHourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="hour"
                      stroke="#666"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Secondi', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [formatTime(value), 'Tempo Medio']}
                    />
                    <Bar
                      dataKey="avgTime"
                      fill={config.color}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Tempo Medio per Giorno della Settimana</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sessionDailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="day"
                      stroke="#666"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Secondi', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [formatTime(value), 'Tempo Medio']}
                    />
                    <Bar
                      dataKey="avgTime"
                      fill={config.color}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Empty state */}
          {chartData.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <h3 style={styles.emptyTitle}>Nessun dato disponibile</h3>
              <p style={styles.emptyText}>
                Non ci sono ancora dati per questo periodo. <br />
                Prova a selezionare un periodo diverso o attendi che arrivino nuovi dati.
              </p>
            </div>
          )}
        </>
      )}

      {/* Modal Drill-Down */}
      {drillDownItem && (
        <>
          <div
            onClick={closeDrillDown}
            style={styles.modalOverlay}
          />
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Analisi Dettagliata: {drillDownItem.name}</h2>
              <button
                onClick={closeDrillDown}
                style={styles.modalCloseButton}
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>

            {drillDownLoading ? (
              <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <p>Caricamento dettagli...</p>
              </div>
            ) : (
              <div style={styles.modalBody}>
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Distribuzione Oraria (Mezz'ora)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={drillDownHourlyComparison.length > 0 ? drillDownHourlyComparison : hourlyDistData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis
                        dataKey="time"
                        stroke="#666"
                        style={{ fontSize: '11px' }}
                        interval={3}
                      />
                      <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          padding: '12px'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            const hasComparison = data.percentage !== undefined
                            return (
                              <div style={{
                                backgroundColor: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '12px'
                              }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '600' }}>
                                  {data.time}
                                </p>
                                <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                                  Visualizzazioni: <strong>{data.count}</strong>
                                </p>
                                {hasComparison && (
                                  <>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>
                                      Periodo precedente: {data.previousCount}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '12px' }}>
                                      <span style={{
                                        color: data.percentage > 0 ? '#4CAF50' : data.percentage < 0 ? '#EF5350' : '#999',
                                        fontWeight: '600'
                                      }}>
                                        {data.percentage > 0 ? '↑' : data.percentage < 0 ? '↓' : '→'} {Math.abs(data.percentage)}%
                                      </span>
                                    </p>
                                  </>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={config.color}
                        strokeWidth={2}
                        dot={{ fill: config.color, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Distribuzione per Giorno della Settimana</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={drillDownDailyComparison.length > 0 ? drillDownDailyComparison : dayDistData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis
                        dataKey="day"
                        stroke="#666"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          padding: '12px'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            const hasComparison = data.percentage !== undefined
                            return (
                              <div style={{
                                backgroundColor: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '12px'
                              }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '600' }}>
                                  {data.day}
                                </p>
                                <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                                  Visualizzazioni: <strong>{data.count}</strong>
                                </p>
                                {hasComparison && (
                                  <>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>
                                      Periodo precedente: {data.previousCount}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '12px' }}>
                                      <span style={{
                                        color: data.percentage > 0 ? '#4CAF50' : data.percentage < 0 ? '#EF5350' : '#999',
                                        fontWeight: '600'
                                      }}>
                                        {data.percentage > 0 ? '↑' : data.percentage < 0 ? '↓' : '→'} {Math.abs(data.percentage)}%
                                      </span>
                                    </p>
                                  </>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill={config.color}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
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
    margin: '0 auto 30px auto',
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

  titleSection: {
    marginBottom: '20px',
  },

  title: {
    fontSize: '24px',
    fontWeight: '400',
    color: '#000',
    margin: '0 0 4px 0',
  },

  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },

  filters: {
    maxWidth: '1200px',
    margin: '0 auto 30px auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    padding: '24px',
    backgroundColor: '#F5F5F5',
    borderRadius: '8px',
    border: '1px solid #E0E0E0'
  },

  filterGroup: {
    flex: '1 1 200px',
  },

  filterLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
    marginBottom: '8px',
  },

  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#000',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },

  dateInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#000',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#000',
    cursor: 'pointer',
    marginTop: '20px',
  },

  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },

  loading: {
    maxWidth: '1200px',
    margin: '60px auto',
    textAlign: 'center',
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px auto',
  },

  statsGrid: {
    maxWidth: '1200px',
    margin: '0 auto 30px auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },

  statCard: {
    backgroundColor: '#F5F5F5',
    padding: '24px',
    borderRadius: '8px',
    border: '1px solid #E0E0E0'
  },

  statLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
    marginBottom: '8px',
  },

  statValue: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '4px',
  },

  statDescription: {
    fontSize: '13px',
    color: '#999',
  },

  chartCard: {
    maxWidth: '1200px',
    margin: '0 auto 30px auto',
    backgroundColor: '#F5F5F5',
    padding: '24px',
    borderRadius: '8px',
    border: '1px solid #E0E0E0'
  },

  chartTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#000',
    margin: '0 0 20px 0',
  },

  toggleCard: {
    maxWidth: '1200px',
    margin: '0 auto 20px auto',
    backgroundColor: '#F5F5F5',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #E0E0E0'
  },

  toggleTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#000',
    margin: '0 0 16px 0',
  },

  toggleButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },

  toggleButton: {
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid #000000',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  },

  tableCard: {
    maxWidth: '1200px',
    margin: '0 auto 30px auto',
    backgroundColor: '#F5F5F5',
    padding: '24px',
    borderRadius: '8px',
    border: '1px solid #E0E0E0'
  },

  tableTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#000',
    margin: '0 0 20px 0',
  },

  tableWrapper: {
    overflowX: 'auto'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '600px'
  },

  th: {
    padding: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#666',
    borderBottom: '1px solid #E0E0E0',
    textAlign: 'center',
    whiteSpace: 'nowrap'
  },

  tr: {
    borderBottom: '1px solid #F0F0F0',
  },

  td: {
    padding: '16px 12px',
    fontSize: '14px',
    color: '#000',
    textAlign: 'center',
  },

  emptyState: {
    maxWidth: '600px',
    margin: '60px auto',
    textAlign: 'center',
    padding: '60px 40px',
    backgroundColor: '#F5F5F5',
    borderRadius: '8px',
    border: '1px solid #E0E0E0'
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },

  emptyTitle: {
    fontSize: '20px',
    fontWeight: '500',
    color: '#000',
    margin: '0 0 12px 0',
  },

  emptyText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
    margin: 0,
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease'
  },

  modalContent: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: '1000px',
    overflow: 'auto',
    zIndex: 1001,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideUp 0.3s ease'
  },

  modalHeader: {
    padding: '24px 32px',
    borderBottom: '1px solid #E0E0E0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 1
  },

  modalTitle: {
    fontSize: '20px',
    fontWeight: '500',
    color: '#000',
    margin: 0
  },

  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
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

  modalSection: {
    marginBottom: '40px'
  },

  modalSectionTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#000',
    margin: '0 0 20px 0'
  }
}

// Aggiungi keyframes per spinner e animazioni
if (typeof document !== 'undefined' && document.styleSheets.length > 0) {
  const styleSheet = document.styleSheets[0]

  try {
    // Controlla se le animazioni non sono già state aggiunte
    const rules = Array.from(styleSheet.cssRules || [])
    const hasSpinAnimation = rules.some(rule => rule.name === 'spin')

    if (!hasSpinAnimation) {
      styleSheet.insertRule(`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `, styleSheet.cssRules.length)

      styleSheet.insertRule(`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `, styleSheet.cssRules.length)

      styleSheet.insertRule(`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `, styleSheet.cssRules.length)
    }
  } catch (e) {
    // Ignora errori se le animazioni esistono già
    console.log('Animazioni CSS già presenti')
  }
}

export default AnalyticsDashboard
