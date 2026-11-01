import { describe, it, expect, vi } from 'vitest'

vi.mock('../utils/richAnalytics', () => ({ trackTrafficSource: vi.fn() }))

const { getUrlParams, parseUTMParams, detectTrafficSource } = await import('./useTrafficSource')

describe('provenienza del traffico', () => {
  it('legge i parametri UTM dopo il # (HashRouter)', () => {
    const loc = { search: '', hash: '#/menu/bar-roma?utm_source=instagram&utm_campaign=estate' }
    expect(parseUTMParams(loc)).toMatchObject({ source: 'instagram', campaign: 'estate' })
  })

  it('legge anche i parametri nella query normale', () => {
    const loc = { search: '?utm_source=facebook', hash: '#/menu/bar-roma' }
    expect(parseUTMParams(loc).source).toBe('facebook')
  })

  it('riconosce la scansione del QR da source=qr', () => {
    const loc = { search: '', hash: '#/menu/bar-roma?source=qr' }
    const fromQr = getUrlParams(loc).get('source') === 'qr'
    expect(fromQr).toBe(true)
    expect(detectTrafficSource(null, null, null, parseUTMParams(loc), fromQr).source).toBe('qr')
  })

  it('senza QR né referrer è traffico diretto', () => {
    const loc = { search: '', hash: '#/menu/bar-roma' }
    expect(detectTrafficSource(null, null, null, parseUTMParams(loc), false).source).toBe('direct')
  })
})
