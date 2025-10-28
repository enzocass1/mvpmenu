/**
 * Plans Service
 *
 * Gestione completa dei piani di abbonamento:
 * - CRUD piani
 * - Assegnazione piani a ristoranti
 * - Feature management
 * - Limiti e quote
 *
 * @module plansService
 */

import { supabase } from '../supabaseClient.js'

class PlansService {
  /**
   * ============================================
   * PLANS CRUD
   * ============================================
   */

  /**
   * Get tutti i piani (visibili o tutti)
   */
  async getAllPlans(includeHidden = false) {
    try {
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!includeHidden) {
        query = query.eq('is_visible', true).eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      console.log(`✅ Loaded ${data?.length || 0} plans`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error loading plans:', error)
      return { data: null, error }
    }
  }

  /**
   * Get piano singolo per ID
   */
  async getPlanById(planId) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error(`❌ Error loading plan ${planId}:`, error)
      return { data: null, error }
    }
  }

  /**
   * Get piano per slug
   */
  async getPlanBySlug(slug) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error(`❌ Error loading plan by slug ${slug}:`, error)
      return { data: null, error }
    }
  }

  /**
   * Creare nuovo piano
   */
  async createPlan(planData) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert([
          {
            name: planData.name,
            slug: planData.slug,
            description: planData.description,
            price_monthly: planData.price_monthly || 0,
            price_yearly: planData.price_yearly || 0,
            currency: planData.currency || 'EUR',
            features: planData.features || [],
            limits: planData.limits || {},
            is_visible: planData.is_visible !== false,
            is_active: planData.is_active !== false,
            sort_order: planData.sort_order || 0,
            metadata: planData.metadata || {},
          },
        ])
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Plan created: ${data.name}`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error creating plan:', error)
      return { data: null, error }
    }
  }

  /**
   * Aggiornare piano esistente
   */
  async updatePlan(planId, updates) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Plan updated: ${data.name}`)
      return { data, error: null }
    } catch (error) {
      console.error(`❌ Error updating plan ${planId}:`, error)
      return { data: null, error }
    }
  }

  /**
   * Eliminare piano (soft delete)
   */
  async deletePlan(planId) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update({ is_active: false })
        .eq('id', planId)
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Plan deactivated: ${data.name}`)
      return { data, error: null }
    } catch (error) {
      console.error(`❌ Error deleting plan ${planId}:`, error)
      return { data: null, error }
    }
  }

  /**
   * ============================================
   * PLAN ASSIGNMENT
   * ============================================
   */

  /**
   * Assegnare piano a ristorante
   */
  async assignPlanToRestaurant(restaurantId, planId, options = {}) {
    try {
      const updates = {
        subscription_plan_id: planId,
        subscription_status: options.status || 'active',
        subscription_started_at: options.started_at || new Date().toISOString(),
      }

      // Set expiration se specificato
      if (options.expires_at) {
        updates.subscription_expires_at = options.expires_at
      }

      // Set trial se specificato
      if (options.trial_ends_at) {
        updates.subscription_trial_ends_at = options.trial_ends_at
        updates.subscription_status = 'trial'
      }

      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', restaurantId)
        .select('*, subscription_plans(*)')
        .single()

      if (error) throw error

      // Log evento
      await this.logSubscriptionEvent(restaurantId, 'subscription.assigned', {
        plan_id: planId,
        plan_name: data.subscription_plans?.name,
        ...options,
      })

      console.log(
        `✅ Plan assigned to restaurant ${restaurantId}: ${data.subscription_plans?.name}`
      )
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error assigning plan:', error)
      return { data: null, error }
    }
  }

  /**
   * Cambiare piano (upgrade/downgrade)
   */
  async changePlan(restaurantId, newPlanId, reason = null) {
    try {
      // Get current plan
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('subscription_plan_id, subscription_plans(*)')
        .eq('id', restaurantId)
        .single()

      const oldPlanId = restaurant?.subscription_plan_id

      // Update plan
      const { data, error } = await supabase
        .from('restaurants')
        .update({
          subscription_plan_id: newPlanId,
          subscription_started_at: new Date().toISOString(),
        })
        .eq('id', restaurantId)
        .select('*, subscription_plans(*)')
        .single()

      if (error) throw error

      // Determine if upgrade or downgrade
      const eventType = this.isUpgrade(restaurant?.subscription_plans, data.subscription_plans)
        ? 'subscription.upgraded'
        : 'subscription.downgraded'

      // Log evento
      await this.logSubscriptionEvent(restaurantId, eventType, {
        old_plan_id: oldPlanId,
        old_plan_name: restaurant?.subscription_plans?.name,
        new_plan_id: newPlanId,
        new_plan_name: data.subscription_plans?.name,
        reason,
      })

      console.log(`✅ Plan changed for restaurant ${restaurantId}`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error changing plan:', error)
      return { data: null, error }
    }
  }

  /**
   * Cancellare subscription
   */
  async cancelSubscription(restaurantId, reason = null) {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .update({
          subscription_status: 'cancelled',
          subscription_cancelled_at: new Date().toISOString(),
        })
        .eq('id', restaurantId)
        .select('*, subscription_plans(*)')
        .single()

      if (error) throw error

      // Log evento
      await this.logSubscriptionEvent(restaurantId, 'subscription.cancelled', {
        plan_name: data.subscription_plans?.name,
        reason,
      })

      console.log(`✅ Subscription cancelled for restaurant ${restaurantId}`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error cancelling subscription:', error)
      return { data: null, error }
    }
  }

  /**
   * ============================================
   * FEATURES MANAGEMENT
   * ============================================
   */

  /**
   * Check se un piano ha una feature
   */
  planHasFeature(plan, featureKey) {
    if (!plan || !plan.features) return false

    // Wildcard (Enterprise, Super Admin)
    if (plan.features.includes('*')) return true

    // Exact match
    if (plan.features.includes(featureKey)) return true

    // Category wildcard (es: 'analytics.*' include 'analytics.advanced')
    const category = featureKey.split('.')[0]
    if (plan.features.includes(`${category}.*`)) return true

    return false
  }

  /**
   * Get all feature flags (per Super Admin)
   */
  async getAllFeatures() {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('❌ Error getting all features:', error)
      return { data: null, error }
    }
  }

  /**
   * Get tutte le features di un piano
   */
  async getPlanFeatures(planId) {
    try {
      const { data: plan, error: planError } = await this.getPlanById(planId)
      if (planError) throw planError

      if (plan.features.includes('*')) {
        // Se wildcard, return tutte le features
        const { data: allFeatures, error: featuresError } = await supabase
          .from('feature_flags')
          .select('*')
          .eq('is_active', true)

        if (featuresError) throw featuresError
        return { data: allFeatures, error: null }
      } else {
        // Return solo features del piano
        const { data: features, error: featuresError } = await supabase
          .from('feature_flags')
          .select('*')
          .in('key', plan.features)
          .eq('is_active', true)

        if (featuresError) throw featuresError
        return { data: features, error: null }
      }
    } catch (error) {
      console.error('❌ Error getting plan features:', error)
      return { data: null, error }
    }
  }

  /**
   * Aggiungere feature a piano
   */
  async addFeatureToPlan(planId, featureKey) {
    try {
      const { data: plan } = await this.getPlanById(planId)

      const currentFeatures = plan.features || []
      if (currentFeatures.includes(featureKey)) {
        console.log(`⚠️ Feature ${featureKey} already in plan`)
        return { data: plan, error: null }
      }

      const updatedFeatures = [...currentFeatures, featureKey]

      const { data, error } = await this.updatePlan(planId, {
        features: updatedFeatures,
      })

      if (error) throw error

      console.log(`✅ Feature ${featureKey} added to plan`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error adding feature to plan:', error)
      return { data: null, error }
    }
  }

  /**
   * Rimuovere feature da piano
   */
  async removeFeatureFromPlan(planId, featureKey) {
    try {
      const { data: plan } = await this.getPlanById(planId)

      const currentFeatures = plan.features || []
      const updatedFeatures = currentFeatures.filter((f) => f !== featureKey)

      const { data, error } = await this.updatePlan(planId, {
        features: updatedFeatures,
      })

      if (error) throw error

      console.log(`✅ Feature ${featureKey} removed from plan`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error removing feature from plan:', error)
      return { data: null, error }
    }
  }

  /**
   * ============================================
   * LIMITS MANAGEMENT
   * ============================================
   */

  /**
   * Check limite del piano
   * @returns {Boolean} true se sotto il limite
   */
  checkLimit(plan, limitKey, currentValue) {
    if (!plan || !plan.limits) return false

    const limit = plan.limits[limitKey]

    // -1 = unlimited
    if (limit === -1 || limit === null || limit === undefined) return true

    // Check se sotto il limite
    return currentValue < limit
  }

  /**
   * Get remaining quota
   */
  getRemainingQuota(plan, limitKey, currentValue) {
    if (!plan || !plan.limits) return 0

    const limit = plan.limits[limitKey]

    // -1 = unlimited
    if (limit === -1) return Infinity

    return Math.max(0, limit - currentValue)
  }

  /**
   * ============================================
   * SUBSCRIPTION EVENTS
   * ============================================
   */

  /**
   * Log evento subscription
   */
  async logSubscriptionEvent(restaurantId, eventType, eventData = {}) {
    try {
      const { data, error } = await supabase.from('subscription_events').insert([
        {
          restaurant_id: restaurantId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) throw error

      console.log(`✅ Subscription event logged: ${eventType}`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error logging subscription event:', error)
      return { data: null, error }
    }
  }

  /**
   * Get eventi subscription per ristorante
   */
  async getSubscriptionEvents(restaurantId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('subscription_events')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('❌ Error getting subscription events:', error)
      return { data: null, error }
    }
  }

  /**
   * Get eventi recenti di tutti i ristoranti (per Super Admin)
   */
  async getRecentEvents(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('subscription_events')
        .select('*, restaurants(name)')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Add restaurant name to metadata
      const events = data.map(event => ({
        ...event,
        metadata: {
          ...event.metadata,
          restaurant_name: event.restaurants?.name || 'N/A'
        }
      }))

      return { data: events, error: null }
    } catch (error) {
      console.error('❌ Error getting recent events:', error)
      return { data: null, error }
    }
  }

  /**
   * ============================================
   * ANALYTICS
   * ============================================
   */

  /**
   * Get statistiche piani
   */
  async getPlansStatistics() {
    try {
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('subscription_plan_id, subscription_status, subscription_plans(name, slug, price_monthly)')

      if (error) throw error

      // Group by plan
      const stats = restaurants.reduce((acc, restaurant) => {
        const planSlug = restaurant.subscription_plans?.slug || 'unknown'
        const planName = restaurant.subscription_plans?.name || 'Unknown'
        const priceMonthly = restaurant.subscription_plans?.price_monthly || 0

        if (!acc[planSlug]) {
          acc[planSlug] = {
            plan_name: planName,
            plan_slug: planSlug,
            price_monthly: priceMonthly,
            total: 0,
            active: 0,
            cancelled: 0,
            trial: 0,
          }
        }

        acc[planSlug].total++

        if (restaurant.subscription_status === 'active') acc[planSlug].active++
        else if (restaurant.subscription_status === 'cancelled') acc[planSlug].cancelled++
        else if (restaurant.subscription_status === 'trial') acc[planSlug].trial++

        return acc
      }, {})

      console.log('✅ Plans statistics loaded')
      return { data: Object.values(stats), error: null }
    } catch (error) {
      console.error('❌ Error getting plans statistics:', error)
      return { data: null, error }
    }
  }

  /**
   * ============================================
   * UTILITY METHODS
   * ============================================
   */

  /**
   * Check se cambio è upgrade
   */
  isUpgrade(oldPlan, newPlan) {
    if (!oldPlan || !newPlan) return false

    // Semplice check basato su prezzo
    return newPlan.price_monthly > oldPlan.price_monthly
  }

  /**
   * Format prezzo per display
   */
  formatPrice(amount, currency = 'EUR', period = 'month') {
    const formatter = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency,
    })

    const periodText = period === 'year' ? '/anno' : '/mese'

    return `${formatter.format(amount)}${periodText}`
  }
}

// Export singleton instance
export const plansService = new PlansService()
export default plansService
