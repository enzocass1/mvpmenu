/**
 * useTrafficSource Hook
 * Detecta e traccia la sorgente di traffico (QR, organic, social)
 */

import { useState, useEffect } from 'react'
import { trackTrafficSource } from '../utils/richAnalytics'

/**
 * Parse UTM parameters from URL
 */
const parseUTMParams = () => {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)

  return {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    content: params.get('utm_content'),
    term: params.get('utm_term')
  }
}

/**
 * Detect social platform from referrer or UTM
 */
const detectSocialPlatform = (referrer, utmParams) => {
  // Check referrer domain
  if (referrer) {
    if (referrer.includes('instagram.com')) return 'instagram'
    if (referrer.includes('facebook.com')) return 'facebook'
    if (referrer.includes('tiktok.com')) return 'tiktok'
    if (referrer.includes('twitter.com') || referrer.includes('x.com')) return 'twitter'
    if (referrer.includes('linkedin.com')) return 'linkedin'
  }

  // Check UTM source
  if (utmParams.source) {
    const source = utmParams.source.toLowerCase()
    if (source.includes('instagram') || source === 'ig') return 'instagram'
    if (source.includes('facebook') || source === 'fb') return 'facebook'
    if (source.includes('tiktok')) return 'tiktok'
    if (source.includes('twitter') || source.includes('x')) return 'twitter'
    if (source.includes('linkedin')) return 'linkedin'
  }

  return null
}

/**
 * Detect traffic source
 */
const detectTrafficSource = (tableId, tableNumber, referrer, utmParams) => {
  // Se arriva da QR (ha tableId nei params)
  if (tableId || tableNumber) {
    return {
      source: 'qr',
      medium: 'qr',
      socialPlatform: null,
      qrTableId: tableId,
      qrTableNumber: tableNumber
    }
  }

  // Detect social platform
  const socialPlatform = detectSocialPlatform(referrer, utmParams)

  if (socialPlatform) {
    return {
      source: 'social',
      medium: socialPlatform,
      socialPlatform,
      qrTableId: null,
      qrTableNumber: null
    }
  }

  // Se ha UTM parameters ma non è social
  if (utmParams.source || utmParams.campaign) {
    return {
      source: utmParams.source === 'google' || utmParams.source === 'bing' ? 'organic' : 'paid',
      medium: utmParams.medium || 'unknown',
      socialPlatform: null,
      qrTableId: null,
      qrTableNumber: null
    }
  }

  // Se ha referrer ma non è social
  if (referrer) {
    const referrerDomain = new URL(referrer).hostname
    if (referrerDomain.includes('google.')) return { source: 'organic', medium: 'google' }
    if (referrerDomain.includes('bing.')) return { source: 'organic', medium: 'bing' }
    return { source: 'referral', medium: referrerDomain }
  }

  // Direct traffic
  return {
    source: 'direct',
    medium: 'none',
    socialPlatform: null,
    qrTableId: null,
    qrTableNumber: null
  }
}

/**
 * Hook per tracking traffic source
 *
 * @param {string} restaurantId - Restaurant ID
 * @param {string} tableId - Table ID from URL params (QR)
 * @param {number} tableNumber - Table number from URL params (QR)
 * @param {string} customerId - Customer ID (se loggato)
 * @returns {object} Traffic source data
 */
export const useTrafficSource = (restaurantId, tableId = null, tableNumber = null, customerId = null) => {
  const [trafficSource, setTrafficSource] = useState(null)
  const [isTracked, setIsTracked] = useState(false)

  useEffect(() => {
    if (!restaurantId || isTracked) return

    const trackSource = async () => {
      try {
        const referrer = document.referrer || null
        const utmParams = parseUTMParams()

        // Detect source
        const detectedSource = detectTrafficSource(tableId, tableNumber, referrer, utmParams)

        setTrafficSource({
          ...detectedSource,
          utmParams,
          referrer
        })

        // Track event
        await trackTrafficSource({
          restaurantId,
          customerId,
          source: detectedSource.source,
          medium: detectedSource.medium,
          socialPlatform: detectedSource.socialPlatform,
          qrTableId: detectedSource.qrTableId,
          qrTableNumber: detectedSource.qrTableNumber,
          utmParams
        })

        // Save to localStorage for session
        localStorage.setItem('traffic_source', JSON.stringify({
          ...detectedSource,
          utmParams,
          timestamp: Date.now()
        }))

        setIsTracked(true)
        console.log('✅ Traffic source tracked:', detectedSource)
      } catch (error) {
        console.error('[useTrafficSource] Error:', error)
      }
    }

    // Check if already tracked in this session (last 24h)
    const savedSource = localStorage.getItem('traffic_source')
    if (savedSource) {
      try {
        const parsed = JSON.parse(savedSource)
        const age = Date.now() - (parsed.timestamp || 0)
        const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

        if (age < MAX_AGE) {
          setTrafficSource(parsed)
          setIsTracked(true)
          console.log('✅ Traffic source already tracked (session):', parsed)
          return
        }
      } catch (e) {
        // Invalid JSON, track again
      }
    }

    trackSource()
  }, [restaurantId, tableId, tableNumber, customerId, isTracked])

  return trafficSource
}

/**
 * Get saved traffic source from localStorage
 */
export const getSavedTrafficSource = () => {
  if (typeof window === 'undefined') return null

  const savedSource = localStorage.getItem('traffic_source')
  if (!savedSource) return null

  try {
    const parsed = JSON.parse(savedSource)
    const age = Date.now() - (parsed.timestamp || 0)
    const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

    if (age < MAX_AGE) {
      return parsed
    }

    // Expired, remove
    localStorage.removeItem('traffic_source')
    return null
  } catch (e) {
    return null
  }
}

export default useTrafficSource
