import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabaseClient', () => ({ supabase: { rpc: vi.fn() } }))

const { parseQuery, resolveQuery, buildQueryText, formatValue, formatBucket, naturalSort, pctChange, TEMPLATES } = await import('./analyticsQuery')

const CATALOG = [
  { name: 'sales', fields: [
    { name: 'orders', kind: 'metric', type: 'number' },
    { name: 'total_sales', kind: 'metric', type: 'money' },
    { name: 'average_order_value', kind: 'metric', type: 'money' },
    { name: 'channel', kind: 'dimension', type: 'channel' },
    { name: 'day_part', kind: 'dimension', type: 'band' },
    { name: 'hour_of_day', kind: 'dimension', type: 'hour' },
  ] },
]
const TODAY = '2026-11-03' // martedì

describe('parseQuery', () => {
  it('legge una query completa in stile ShopifyQL', () => {
    const q = parseQuery(`FROM sales
      SHOW orders, total_sales
      WHERE channel IN ('menu', 'staff')
      GROUP BY day_part
      TIMESERIES hour WITH TOTALS, PERCENT_CHANGE, CURRENCY 'EUR'
      HAVING orders > 5
      DURING today
      COMPARE TO yesterday
      ORDER BY total_sales DESC
      LIMIT 50
    VISUALIZE total_sales TYPE line`)
    expect(q.from).toBe('sales')
    expect(q.show).toEqual(['orders', 'total_sales'])
    expect(q.where).toEqual([{ field: 'channel', op: 'IN', value: ['menu', 'staff'] }])
    expect(q.group_by).toEqual(['day_part'])
    expect(q.timeseries).toBe('hour')
    expect(q.with).toEqual(['totals', 'percent_change'])
    expect(q.having).toEqual([{ field: 'orders', op: '>', value: 5 }])
    expect(q.during).toBe('today')
    expect(q.compare).toEqual({ name: 'yesterday' })
    expect(q.order_by).toEqual([{ field: 'total_sales', dir: 'DESC' }])
    expect(q.limit).toBe(50)
    expect(q.visualize).toEqual(['total_sales'])
    expect(q.chart).toBe('line')
  })

  it('accetta l\'esempio Shopify ma segnala i campi che non esistono nel locale', () => {
    const q = parseQuery(`FROM sales
      SHOW orders, gross_sales, discounts, sales_reversals, net_sales,
        shipping_charges, duties, additional_fees, taxes, total_sales
      TIMESERIES hour WITH TOTALS, PERCENT_CHANGE, CURRENCY 'EUR'
      DURING today
      COMPARE TO yesterday
      ORDER BY hour ASC
      LIMIT 1000
    VISUALIZE total_sales TYPE line`)
    expect(q.show).toHaveLength(10)
    expect(() => resolveQuery(q, CATALOG, TODAY)).toThrow(/gross_sales" non esiste in sales/)
  })

  it('periodi con SINCE / UNTIL e date esplicite', () => {
    expect(parseQuery("FROM sales SHOW orders SINCE -7d UNTIL today").since).toBe('-7d')
    const q = parseQuery("FROM sales SHOW orders DURING '2026-10-01' TO '2026-10-31'")
    expect([q.since, q.until]).toEqual(['2026-10-01', '2026-10-31'])
    expect(resolveQuery(q, CATALOG, TODAY).range).toEqual(['2026-10-01', '2026-10-31'])
  })

  it('errori comprensibili', () => {
    expect(() => parseQuery('SHOW orders')).toThrow(/Manca FROM/)
    expect(() => parseQuery('FROM sales')).toThrow(/Manca SHOW/)
    expect(() => parseQuery('FROM sales SHOW orders TIMESERIES minute')).toThrow(/TIMESERIES accetta/)
    expect(() => parseQuery("FROM sales SHOW orders WHERE channel = 'a' OR channel = 'b'")).toThrow(/OR non è supportato/)
    expect(() => resolveQuery(parseQuery('FROM sales SHOW orders ORDER BY channel'), CATALOG, TODAY)).toThrow(/ORDER BY/)
    expect(() => resolveQuery(parseQuery('FROM vendite SHOW orders'), CATALOG, TODAY)).toThrow(/inesistente/)
  })
})

describe('resolveQuery: periodi e confronti', () => {
  const run = (text) => resolveQuery(parseQuery(text), CATALOG, TODAY)
  it('periodi con nome', () => {
    expect(run('FROM sales SHOW orders DURING today').range).toEqual([TODAY, TODAY])
    expect(run('FROM sales SHOW orders DURING last_7_days').range).toEqual(['2026-10-28', TODAY])
    expect(run('FROM sales SHOW orders DURING this_week').range).toEqual(['2026-11-02', TODAY])
    expect(run('FROM sales SHOW orders DURING last_week').range).toEqual(['2026-10-26', '2026-11-01'])
    expect(run('FROM sales SHOW orders DURING last_month').range).toEqual(['2026-10-01', '2026-10-31'])
    expect(run('FROM sales SHOW orders').range).toEqual(['2026-10-05', TODAY]) // predefinito: ultimi 30 giorni
  })
  it('confronti', () => {
    expect(run('FROM sales SHOW orders DURING today COMPARE TO yesterday').compare).toEqual(['2026-11-02', '2026-11-02'])
    expect(run('FROM sales SHOW orders DURING last_7_days COMPARE TO previous_period').compare).toEqual(['2026-10-21', '2026-10-27'])
    expect(run('FROM sales SHOW orders DURING last_month COMPARE TO previous_year').compare).toEqual(['2025-10-01', '2025-10-31'])
  })
  it('grafico predefinito', () => {
    expect(run('FROM sales SHOW orders TIMESERIES day').chart).toBe('line')
    expect(run('FROM sales SHOW orders GROUP BY channel').chart).toBe('bar')
    expect(run('FROM sales SHOW orders').chart).toBe('table')
  })
})

describe('costruttore e formattazione', () => {
  it('il testo generato dal costruttore si rilegge uguale', () => {
    const text = buildQueryText({ from: 'sales', show: ['orders', 'total_sales'], group_by: ['channel'], during: 'last_7_days', compare: 'previous_period', chart: 'bar' })
    const q = parseQuery(text)
    expect([q.from, q.show, q.group_by, q.during, q.compare, q.chart]).toEqual(['sales', ['orders', 'total_sales'], ['channel'], 'last_7_days', { name: 'previous_period' }, 'bar'])
  })
  it('tutte le analisi pronte sono valide', () => {
    for (const t of TEMPLATES) expect(() => parseQuery(t.query), t.name).not.toThrow()
  })
  it('valori in italiano', () => {
    expect(formatValue('money', 1234.5)).toBe('€1.234,50')
    expect(formatValue('percent', 12.345)).toBe('12,3%')
    expect(formatValue('duration', 1170)).toBe('19,5 min')
    expect(formatValue('channel', 'banco')).toBe('Banco')
    expect(formatValue('band', 4)).toBe('Aperitivo (18-21)')
    expect(formatBucket('2026-11-03T10:00', 'hour', true)).toBe('10:00')
    expect(formatBucket('2026-11-03T00:00', 'day')).toBe('mar 03/11')
    expect(pctChange(110, 100)).toBeCloseTo(10)
    expect(pctChange(5, 0)).toBeNull()
  })
  it('le ore seguono la giornata del locale (dalle 6)', () => {
    const rows = [{ h: 0 }, { h: 23 }, { h: 6 }, { h: 12 }]
    expect(naturalSort(rows, 'h', 'hour').map(r => r.h)).toEqual([6, 12, 23, 0])
  })
})

describe('serializeQuery', () => {
  it('riscrive ogni query pronta senza perdere nulla', async () => {
    const { serializeQuery } = await import('./analyticsQuery')
    for (const t of TEMPLATES) {
      const q = parseQuery(t.query)
      const again = parseQuery(serializeQuery(q))
      expect({ ...again, with: [] }, t.name).toEqual({ ...q, with: [] })
    }
  })
  it('suggerisce il nome giusto per i campi di Shopify', () => {
    const q = parseQuery('FROM sales SHOW net_sales')
    expect(() => resolveQuery(q, CATALOG, TODAY)).toThrow(/usa total_sales/)
  })
})
