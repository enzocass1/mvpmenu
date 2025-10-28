/**
 * Access Control Service
 *
 * Controllo accessi a doppio livello:
 * 1. Piano abbonamento → Cosa è disponibile per il ristorante
 * 2. Ruolo/Permission → Chi può accedere
 *
 * Accesso concesso SOLO SE:
 * - Piano include la feature (planHasFeature)
 * - Ruolo ha il permesso (roleHasPermission)
 *
 * @module accessControlService
 */

import { supabase } from '../supabaseClient.js'
import { plansService } from './plansService.js'

class AccessControlService {
  /**
   * ============================================
   * CORE ACCESS CONTROL
   * ============================================
   */

  /**
   * Check accesso principale - doppio livello
   *
   * @param {Object} user - Utente corrente (con permissions array)
   * @param {Object} restaurant - Ristorante (con subscription_plan)
   * @param {String} featureKey - Feature key (es: 'analytics.advanced')
   * @param {String} permissionKey - Permission key (es: 'analytics.view_reports')
   * @returns {Boolean}
   */
  canAccess(user, restaurant, featureKey, permissionKey) {
    // 1. Check Piano: il piano del ristorante include questa feature?
    const planHasFeature = this.planHasFeature(restaurant?.subscription_plans, featureKey)

    // 2. Check Permission: il ruolo utente ha questo permesso?
    const roleHasPermission = this.roleHasPermission(user?.permissions, permissionKey)

    // 3. Log per debugging
    if (!planHasFeature) {
      console.log(`🚫 Access denied: Plan doesn't include feature '${featureKey}'`)
      this.logAccessDenied(user, restaurant, featureKey, 'plan_restriction')
    }

    if (!roleHasPermission) {
      console.log(`🚫 Access denied: Role doesn't have permission '${permissionKey}'`)
      this.logAccessDenied(user, restaurant, featureKey, 'permission_restriction')
    }

    // 4. Accesso concesso SOLO SE entrambi true
    return planHasFeature && roleHasPermission
  }

  /**
   * Check se il piano include una feature
   */
  planHasFeature(plan, featureKey) {
    if (!plan || !plan.features) {
      console.log(`⚠️ No plan or features found`)
      return false
    }

    // Wildcard (Enterprise, Super Admin, Premium Legacy)
    if (plan.features.includes('*')) {
      console.log(`✅ Plan has wildcard access`)
      return true
    }

    // Exact match
    if (plan.features.includes(featureKey)) {
      console.log(`✅ Plan has exact feature: ${featureKey}`)
      return true
    }

    // Category wildcard (es: 'analytics.*' include 'analytics.advanced')
    const category = featureKey.split('.')[0]
    const categoryWildcard = `${category}.*`

    if (plan.features.includes(categoryWildcard)) {
      console.log(`✅ Plan has category wildcard: ${categoryWildcard}`)
      return true
    }

    console.log(`❌ Plan doesn't have feature: ${featureKey}`)
    return false
  }

  /**
   * Check se il ruolo ha un permesso
   */
  roleHasPermission(permissions, permissionKey) {
    if (!permissions || !Array.isArray(permissions)) {
      console.log(`⚠️ No permissions array found`)
      return false
    }

    // Wildcard (Proprietario, Super Admin)
    if (permissions.includes('*')) {
      console.log(`✅ Role has wildcard permissions`)
      return true
    }

    // Exact match
    if (permissions.includes(permissionKey)) {
      console.log(`✅ Role has permission: ${permissionKey}`)
      return true
    }

    console.log(`❌ Role doesn't have permission: ${permissionKey}`)
    return false
  }

  /**
   * ============================================
   * FEATURE ACCESS HELPERS
   * ============================================
   */

  /**
   * Get lista di tutte le features accessibili per questo utente
   *
   * @param {Object} user - Utente corrente
   * @param {Object} restaurant - Ristorante
   * @returns {Array} Features accessibili
   */
  async getAvailableFeatures(user, restaurant) {
    try {
      // Get tutte le feature flags
      const { data: allFeatures, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      // Filter features in base a plan + permission
      const availableFeatures = allFeatures.filter((feature) =>
        this.canAccess(user, restaurant, feature.key, feature.requires_permission)
      )

      console.log(
        `✅ Available features: ${availableFeatures.length}/${allFeatures.length}`
      )

      return availableFeatures
    } catch (error) {
      console.error('❌ Error getting available features:', error)
      return []
    }
  }

  /**
   * Get features accessibili raggruppate per categoria
   */
  async getAvailableFeaturesByCategory(user, restaurant) {
    try {
      const features = await this.getAvailableFeatures(user, restaurant)

      const grouped = features.reduce((acc, feature) => {
        const category = feature.category || 'other'

        if (!acc[category]) {
          acc[category] = []
        }

        acc[category].push(feature)
        return acc
      }, {})

      return grouped
    } catch (error) {
      console.error('❌ Error grouping features:', error)
      return {}
    }
  }

  /**
   * Check se può accedere a una categoria completa
   */
  canAccessCategory(user, restaurant, category) {
    const plan = restaurant?.subscription_plans

    // Wildcard plan
    if (plan?.features?.includes('*')) return true

    // Category wildcard
    if (plan?.features?.includes(`${category}.*`)) return true

    // Check almeno una feature della categoria
    const hasAnyFeature = plan?.features?.some((f) => f.startsWith(`${category}.`))

    return hasAnyFeature
  }

  /**
   * ============================================
   * LIMITS MANAGEMENT
   * ============================================
   */

  /**
   * Check limite del piano
   *
   * @param {Object} restaurant - Ristorante
   * @param {String} limitKey - Chiave limite (es: 'staff_members')
   * @param {Number} currentValue - Valore corrente
   * @returns {Boolean} true se sotto il limite
   */
  checkLimit(restaurant, limitKey, currentValue) {
    const plan = restaurant?.subscription_plans

    if (!plan || !plan.limits) {
      console.log(`⚠️ No plan or limits found`)
      return false
    }

    const limit = plan.limits[limitKey]

    // -1 = unlimited
    if (limit === -1 || limit === null || limit === undefined) {
      console.log(`✅ Unlimited ${limitKey}`)
      return true
    }

    // Check se sotto il limite
    const withinLimit = currentValue < limit

    if (!withinLimit) {
      console.log(`🚫 Limit reached for ${limitKey}: ${currentValue}/${limit}`)
      this.logLimitReached(restaurant, limitKey, currentValue, limit)
    }

    return withinLimit
  }

  /**
   * Get quota rimanente
   */
  getRemainingQuota(restaurant, limitKey, currentValue) {
    const plan = restaurant?.subscription_plans

    if (!plan || !plan.limits) return 0

    const limit = plan.limits[limitKey]

    // -1 = unlimited
    if (limit === -1) return Infinity

    return Math.max(0, limit - currentValue)
  }

  /**
   * Get percentuale uso quota
   */
  getQuotaUsagePercentage(restaurant, limitKey, currentValue) {
    const plan = restaurant?.subscription_plans

    if (!plan || !plan.limits) return 0

    const limit = plan.limits[limitKey]

    // -1 = unlimited
    if (limit === -1) return 0

    return Math.min(100, Math.round((currentValue / limit) * 100))
  }

  /**
   * Check se quota è quasi esaurita (>80%)
   */
  isQuotaNearLimit(restaurant, limitKey, currentValue) {
    const percentage = this.getQuotaUsagePercentage(restaurant, limitKey, currentValue)
    return percentage >= 80
  }

  /**
   * ============================================
   * NAVIGATION FILTERING
   * ============================================
   */

  /**
   * Filter navigation items in base a accesso
   * Usato per Sidebar, menu, ecc.
   *
   * @param {Array} navigationItems - Array di navigation items con feature + permission
   * @param {Object} user - Utente corrente
   * @param {Object} restaurant - Ristorante
   * @returns {Array} Filtered navigation items
   */
  filterNavigation(navigationItems, user, restaurant) {
    return navigationItems.filter((item) => {
      // Se no required permission/feature, sempre visibile
      if (!item.requiredFeature && !item.requiredPermission) {
        return true
      }

      // Se ha entrambi, check entrambi
      if (item.requiredFeature && item.requiredPermission) {
        return this.canAccess(user, restaurant, item.requiredFeature, item.requiredPermission)
      }

      // Se solo feature
      if (item.requiredFeature) {
        return this.planHasFeature(restaurant?.subscription_plans, item.requiredFeature)
      }

      // Se solo permission
      if (item.requiredPermission) {
        return this.roleHasPermission(user?.permissions, item.requiredPermission)
      }

      return true
    })
  }

  /**
   * ============================================
   * UPGRADE SUGGESTIONS
   * ============================================
   */

  /**
   * Get suggerimento upgrade in base a feature richiesta
   *
   * @param {Object} restaurant - Ristorante corrente
   * @param {String} featureKey - Feature che l'utente vuole
   * @returns {Object} Piano suggerito
   */
  async suggestUpgrade(restaurant, featureKey) {
    try {
      const currentPlan = restaurant?.subscription_plans

      // Get tutti i piani visibili
      const { data: plans } = await plansService.getAllPlans(false)

      // Filter piani che includono questa feature
      const plansWithFeature = plans.filter((plan) =>
        plansService.planHasFeature(plan, featureKey)
      )

      // Sort per prezzo
      plansWithFeature.sort((a, b) => a.price_monthly - b.price_monthly)

      // Suggerisci il più economico che ha la feature
      const suggestion = plansWithFeature.find(
        (plan) => plan.price_monthly > (currentPlan?.price_monthly || 0)
      )

      return suggestion || null
    } catch (error) {
      console.error('❌ Error suggesting upgrade:', error)
      return null
    }
  }

  /**
   * ============================================
   * LOGGING & ANALYTICS
   * ============================================
   */

  /**
   * Log accesso negato
   */
  async logAccessDenied(user, restaurant, featureKey, reason) {
    try {
      await supabase.from('analytics_events').insert([
        {
          restaurant_id: restaurant?.id,
          event_type: 'access.denied',
          event_data: {
            user_id: user?.id,
            user_email: user?.email,
            feature_key: featureKey,
            reason: reason, // 'plan_restriction' or 'permission_restriction'
            plan_slug: restaurant?.subscription_plans?.slug,
            plan_name: restaurant?.subscription_plans?.name,
          },
        },
      ])
    } catch (error) {
      console.error('❌ Error logging access denied:', error)
    }
  }

  /**
   * Log limite raggiunto
   */
  async logLimitReached(restaurant, limitKey, currentValue, limitValue) {
    try {
      await supabase.from('analytics_events').insert([
        {
          restaurant_id: restaurant?.id,
          event_type: 'limit.reached',
          event_data: {
            limit_key: limitKey,
            current_value: currentValue,
            limit_value: limitValue,
            plan_slug: restaurant?.subscription_plans?.slug,
            plan_name: restaurant?.subscription_plans?.name,
          },
        },
      ])
    } catch (error) {
      console.error('❌ Error logging limit reached:', error)
    }
  }

  /**
   * ============================================
   * REACT HOOKS UTILITIES
   * ============================================
   */

  /**
   * Create props per FeatureGate component
   */
  createFeatureGateProps(user, restaurant) {
    return {
      canAccess: (feature, permission) => this.canAccess(user, restaurant, feature, permission),
      planHasFeature: (feature) => this.planHasFeature(restaurant?.subscription_plans, feature),
      roleHasPermission: (permission) => this.roleHasPermission(user?.permissions, permission),
      checkLimit: (limitKey, currentValue) =>
        this.checkLimit(restaurant, limitKey, currentValue),
      getRemainingQuota: (limitKey, currentValue) =>
        this.getRemainingQuota(restaurant, limitKey, currentValue),
    }
  }
}

// Export singleton instance
export const accessControl = new AccessControlService()
export default accessControl
