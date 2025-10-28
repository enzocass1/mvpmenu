/**
 * Restaurants Service
 *
 * Servizio per gestire i ristoranti dal punto di vista Super Admin
 */

import { supabase } from '../supabaseClient'

const restaurantsService = {
  /**
   * Get all restaurants with subscription data
   */
  async getAllRestaurants() {
    try {
      // Use database view to get restaurants with user emails
      // This view has elevated privileges to access auth.users
      const { data, error } = await supabase
        .from('restaurants_with_user_emails')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to match expected format
      const restaurants = (data || []).map(restaurant => ({
        id: restaurant.id,
        name: restaurant.name,
        subdomain: restaurant.subdomain,
        created_at: restaurant.created_at,
        updated_at: restaurant.updated_at,
        subscription_status: restaurant.subscription_status,
        subscription_started_at: restaurant.subscription_started_at,
        subscription_expires_at: restaurant.subscription_expires_at,
        subscription_trial_ends_at: restaurant.subscription_trial_ends_at,
        subscription_cancelled_at: restaurant.subscription_cancelled_at,
        subscription_metadata: restaurant.subscription_metadata,
        user_id: restaurant.user_id,
        subscription_plan_id: restaurant.subscription_plan_id,
        is_trial_used: restaurant.is_trial_used,
        owner_email: restaurant.owner_email,
        subscription_plans: restaurant.plan_name ? {
          id: restaurant.subscription_plan_id,
          name: restaurant.plan_name,
          slug: restaurant.plan_slug,
          price_monthly: restaurant.plan_price_monthly,
          price_yearly: restaurant.plan_price_yearly,
          currency: restaurant.plan_currency,
          is_legacy: restaurant.plan_is_legacy
        } : null
      }))

      return {
        data: restaurants,
        error: null
      }
    } catch (err) {
      console.error('❌ Error fetching restaurants:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Update restaurant subscription plan
   */
  async updateRestaurantPlan(restaurantId, planId, options = {}) {
    try {
      const updateData = {
        subscription_plan_id: planId,
        subscription_status: options.status || 'active',
        updated_at: new Date().toISOString()
      }

      // Se cambiamo piano, aggiorniamo anche le date
      if (options.startNow) {
        updateData.subscription_started_at = new Date().toISOString()
      }

      if (options.expiresAt) {
        updateData.subscription_expires_at = options.expiresAt
      }

      const { data, error } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', restaurantId)
        .select()
        .single()

      if (error) throw error

      // Crea evento di cambio piano
      await this.createSubscriptionEvent(restaurantId, planId, 'subscription.plan_changed', {
        previous_plan_id: options.previousPlanId,
        new_plan_id: planId,
        changed_by: 'super_admin',
        reason: options.reason || 'Manual change'
      })

      return {
        data,
        error: null
      }
    } catch (err) {
      console.error('❌ Error updating restaurant plan:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Delete restaurant (soft delete by deactivating)
   */
  async deleteRestaurant(restaurantId) {
    try {
      // Invece di eliminare, disattiviamo il ristorante
      const { data, error } = await supabase
        .from('restaurants')
        .update({
          subscription_status: 'suspended',
          subscription_cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurantId)
        .select()
        .single()

      if (error) throw error

      // Crea evento di sospensione
      await this.createSubscriptionEvent(restaurantId, null, 'subscription.suspended', {
        suspended_by: 'super_admin',
        reason: 'Account deleted by Super Admin'
      })

      return {
        data,
        error: null
      }
    } catch (err) {
      console.error('❌ Error deleting restaurant:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Hard delete restaurant (DANGEROUS!)
   */
  async hardDeleteRestaurant(restaurantId) {
    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId)

      if (error) throw error

      return {
        success: true,
        error: null
      }
    } catch (err) {
      console.error('❌ Error hard deleting restaurant:', err)
      return {
        success: false,
        error: err
      }
    }
  },

  /**
   * Create subscription event
   */
  async createSubscriptionEvent(restaurantId, planId, eventType, eventData = {}) {
    try {
      const { data, error } = await supabase
        .from('subscription_events')
        .insert({
          restaurant_id: restaurantId,
          plan_id: planId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return {
        data,
        error: null
      }
    } catch (err) {
      console.error('❌ Error creating subscription event:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Get restaurant statistics
   */
  async getRestaurantStats() {
    try {
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, subscription_status, subscription_plan_id, created_at')

      if (error) throw error

      const stats = {
        total: restaurants.length,
        active: restaurants.filter(r => r.subscription_status === 'active').length,
        trial: restaurants.filter(r => r.subscription_status === 'trial').length,
        expired: restaurants.filter(r => r.subscription_status === 'expired').length,
        cancelled: restaurants.filter(r => r.subscription_status === 'cancelled').length,
        suspended: restaurants.filter(r => r.subscription_status === 'suspended').length,
        byPlan: {}
      }

      // Raggruppa per piano
      restaurants.forEach(r => {
        const planId = r.subscription_plan_id || 'no_plan'
        stats.byPlan[planId] = (stats.byPlan[planId] || 0) + 1
      })

      return {
        data: stats,
        error: null
      }
    } catch (err) {
      console.error('❌ Error fetching restaurant stats:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Export restaurants to CSV
   */
  exportToCSV(restaurants) {
    const headers = [
      'ID',
      'Nome',
      'Subdomain',
      'Email Owner',
      'Piano',
      'Stato',
      'Data Iscrizione',
      'Data Scadenza',
      'Prezzo Mensile'
    ]

    const rows = restaurants.map(r => [
      r.id,
      r.name,
      r.subdomain,
      r.owner_email,
      r.subscription_plans?.name || 'N/A',
      r.subscription_status || 'unknown',
      new Date(r.created_at).toLocaleDateString('it-IT'),
      r.subscription_expires_at ? new Date(r.subscription_expires_at).toLocaleDateString('it-IT') : 'N/A',
      r.subscription_plans?.price_monthly ? `€${r.subscription_plans.price_monthly}` : 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  },

  /**
   * Download CSV file
   */
  downloadCSV(csvContent, filename = 'restaurants-export.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export default restaurantsService
