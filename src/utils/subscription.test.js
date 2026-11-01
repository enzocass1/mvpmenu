import { describe, it, expect } from 'vitest'
import { checkPremiumAccess, getPlanInfo } from './subscription'

describe('accesso Premium', () => {
  it('piano free: nessun accesso Premium', () => {
    expect(checkPremiumAccess({ subscription_tier: 'free', subscription_status: 'active' }).hasValidAccess).toBe(false)
  })

  it('premium attivo: accesso valido', () => {
    expect(checkPremiumAccess({ subscription_tier: 'premium', subscription_status: 'active' }).hasValidAccess).toBe(true)
  })

  it('premium in prova: valgono sia "trialing" (Stripe) sia "trial" (super-admin)', () => {
    expect(checkPremiumAccess({ subscription_tier: 'premium', subscription_status: 'trialing' }).hasValidAccess).toBe(true)
    expect(checkPremiumAccess({ subscription_tier: 'premium', subscription_status: 'trial' }).hasValidAccess).toBe(true)
  })

  it('premium scaduto: nessun accesso', () => {
    expect(checkPremiumAccess({ subscription_tier: 'premium', subscription_status: 'past_due' }).hasValidAccess).toBe(false)
  })

  it('passando un id (stringa) invece del ristorante non concede Premium', () => {
    // Era il bug di AnalyticsPage: l'oggetto restituito veniva usato come "vero"
    expect(checkPremiumAccess('uuid-del-ristorante').hasValidAccess).toBe(false)
  })

  it('getPlanInfo distingue Free e Premium', () => {
    expect(getPlanInfo({ subscription_tier: 'free' }).name).toBe('Free')
    expect(getPlanInfo({ subscription_tier: 'premium', subscription_status: 'active' }).name).toBe('Premium')
  })
})
