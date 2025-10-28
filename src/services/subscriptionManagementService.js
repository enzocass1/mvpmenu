/**
 * Subscription Management Service
 *
 * Servizio per gestire trial period e upgrade temporanei
 */

import { supabase } from '../supabaseClient'

const subscriptionManagementService = {
  /**
   * Assign trial to new restaurant
   */
  async assignTrialToRestaurant(restaurantId) {
    try {
      // 1. Get FREE plan configuration
      const { data: freePlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('slug', 'free')
        .eq('is_active', true)
        .single()

      if (planError) throw planError

      // 2. Check if trial is enabled
      if (!freePlan.trial_enabled || !freePlan.trial_plan_id) {
        console.log('Trial not enabled, assigning FREE plan directly')
        return await this.assignFreePlan(restaurantId)
      }

      // 3. Calculate trial end date
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + freePlan.trial_days)

      // 4. Assign trial
      const { data, error } = await supabase
        .from('restaurants')
        .update({
          subscription_plan_id: freePlan.trial_plan_id,
          subscription_status: 'trial',
          subscription_trial_ends_at: trialEndsAt.toISOString(),
          subscription_started_at: new Date().toISOString(),
          is_trial_used: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurantId)
        .select()
        .single()

      if (error) throw error

      // 5. Log event
      await this.logSubscriptionEvent(restaurantId, freePlan.trial_plan_id, 'subscription.trial_started', {
        trial_days: freePlan.trial_days,
        trial_ends_at: trialEndsAt.toISOString()
      })

      return {
        data,
        error: null
      }
    } catch (err) {
      console.error('❌ Error assigning trial:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Assign FREE plan (no trial)
   */
  async assignFreePlan(restaurantId) {
    try {
      const { data: freePlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('slug', 'free')
        .eq('is_active', true)
        .single()

      if (planError) throw planError

      const { data, error } = await supabase
        .from('restaurants')
        .update({
          subscription_plan_id: freePlan.id,
          subscription_status: 'active',
          subscription_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurantId)
        .select()
        .single()

      if (error) throw error

      return {
        data,
        error: null
      }
    } catch (err) {
      console.error('❌ Error assigning FREE plan:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Create temporary upgrade (single restaurant)
   */
  async createTemporaryUpgrade(restaurantId, tempPlanId, durationDays, reason = '') {
    try {
      // 1. Get current restaurant data
      const { data: restaurant, error: restError } = await supabase
        .from('restaurants')
        .select('subscription_plan_id, subscription_status')
        .eq('id', restaurantId)
        .single()

      if (restError) throw restError

      // 2. Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + durationDays)

      // 3. Create temporary upgrade record
      const { data: upgrade, error: upgradeError } = await supabase
        .from('temporary_upgrades')
        .insert({
          restaurant_id: restaurantId,
          original_plan_id: restaurant.subscription_plan_id,
          original_status: restaurant.subscription_status,
          temporary_plan_id: tempPlanId,
          expires_at: expiresAt.toISOString(),
          reason: reason,
          is_active: true
        })
        .select()
        .single()

      if (upgradeError) throw upgradeError

      // 4. Apply upgrade to restaurant (using RPC to bypass RLS)
      console.log('🔄 Applying upgrade to restaurant...', { restaurantId, tempPlanId })
      const { data: updateData, error: updateError } = await supabase
        .rpc('super_admin_apply_temp_upgrade', {
          p_restaurant_id: restaurantId,
          p_temp_plan_id: tempPlanId,
          p_expires_at: expiresAt.toISOString()
        })

      if (updateError) {
        console.error('❌ Error updating restaurant:', updateError)
        throw updateError
      }

      console.log('✅ Restaurant updated:', updateData)

      // 5. Log event
      await this.logSubscriptionEvent(restaurantId, tempPlanId, 'subscription.temporary_upgrade', {
        duration_days: durationDays,
        expires_at: expiresAt.toISOString(),
        reason: reason
      })

      return {
        data: upgrade,
        error: null
      }
    } catch (err) {
      console.error('❌ Error creating temporary upgrade:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Create mass temporary upgrades
   */
  async createMassTemporaryUpgrades(restaurantIds, tempPlanId, durationDays, reason = '') {
    try {
      const results = {
        success: [],
        errors: []
      }

      // Process each restaurant
      for (const restaurantId of restaurantIds) {
        const result = await this.createTemporaryUpgrade(restaurantId, tempPlanId, durationDays, reason)

        if (result.error) {
          results.errors.push({
            restaurantId,
            error: result.error.message
          })
        } else {
          results.success.push(restaurantId)
        }
      }

      return {
        data: results,
        error: null
      }
    } catch (err) {
      console.error('❌ Error creating mass upgrades:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Get active temporary upgrade for restaurant
   */
  async getActiveTemporaryUpgrade(restaurantId) {
    try {
      const { data, error } = await supabase
        .from('temporary_upgrades')
        .select(`
          *,
          temporary_plan:subscription_plans!temporary_upgrades_temporary_plan_id_fkey(
            id,
            name,
            slug
          )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      return {
        data: data || null,
        error: null
      }
    } catch (err) {
      console.error('❌ Error getting active temporary upgrade:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Restore original plan after temporary upgrade expires
   */
  async restoreOriginalPlan(upgradeId) {
    try {
      // 1. Get upgrade data
      const { data: upgrade, error: upgradeError } = await supabase
        .from('temporary_upgrades')
        .select('*')
        .eq('id', upgradeId)
        .single()

      if (upgradeError) throw upgradeError

      // 2. Restore original plan
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          subscription_plan_id: upgrade.original_plan_id,
          subscription_status: upgrade.original_status,
          subscription_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', upgrade.restaurant_id)

      if (updateError) throw updateError

      // 3. Deactivate upgrade
      const { error: deactivateError } = await supabase
        .from('temporary_upgrades')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', upgradeId)

      if (deactivateError) throw deactivateError

      // 4. Log event
      await this.logSubscriptionEvent(
        upgrade.restaurant_id,
        upgrade.original_plan_id,
        'subscription.temp_upgrade_expired',
        {
          temporary_plan_id: upgrade.temporary_plan_id,
          reason: upgrade.reason,
          restored_at: new Date().toISOString()
        }
      )

      return {
        success: true,
        error: null
      }
    } catch (err) {
      console.error('❌ Error restoring original plan:', err)
      return {
        success: false,
        error: err
      }
    }
  },

  /**
   * Downgrade to FREE plan
   */
  async downgradeToFree(restaurantId, reason) {
    try {
      // 1. Get FREE plan
      const { data: freePlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('slug', 'free')
        .eq('is_active', true)
        .single()

      if (planError) throw planError

      // 2. Update restaurant
      const { data, error } = await supabase
        .from('restaurants')
        .update({
          subscription_plan_id: freePlan.id,
          subscription_status: 'active',
          subscription_trial_ends_at: null,
          subscription_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurantId)
        .select()
        .single()

      if (error) throw error

      // 3. Log event
      await this.logSubscriptionEvent(restaurantId, freePlan.id, 'subscription.downgraded', {
        reason,
        downgraded_at: new Date().toISOString()
      })

      return {
        data,
        error: null
      }
    } catch (err) {
      console.error('❌ Error downgrading to FREE:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Check and process expired subscriptions (CRON job)
   */
  async checkExpiredSubscriptions() {
    try {
      const now = new Date().toISOString()
      const results = {
        expiredTrials: [],
        expiredSubscriptions: [],
        expiredTempUpgrades: []
      }

      // 1. Check expired trials
      const { data: expiredTrials } = await supabase
        .from('restaurants')
        .select('id, subscription_trial_ends_at')
        .eq('subscription_status', 'trial')
        .lt('subscription_trial_ends_at', now)

      for (const restaurant of expiredTrials || []) {
        await this.downgradeToFree(restaurant.id, 'trial_expired')
        results.expiredTrials.push(restaurant.id)
      }

      // 2. Check expired subscriptions
      const { data: expiredSubs } = await supabase
        .from('restaurants')
        .select('id, subscription_expires_at')
        .in('subscription_status', ['active', 'trial'])
        .not('subscription_expires_at', 'is', null)
        .lt('subscription_expires_at', now)

      for (const restaurant of expiredSubs || []) {
        await this.downgradeToFree(restaurant.id, 'subscription_expired')
        results.expiredSubscriptions.push(restaurant.id)
      }

      // 3. Check expired temporary upgrades
      const { data: expiredUpgrades } = await supabase
        .from('temporary_upgrades')
        .select('id, restaurant_id')
        .eq('is_active', true)
        .lt('expires_at', now)

      for (const upgrade of expiredUpgrades || []) {
        await this.restoreOriginalPlan(upgrade.id)
        results.expiredTempUpgrades.push(upgrade.restaurant_id)
      }

      return {
        data: results,
        error: null
      }
    } catch (err) {
      console.error('❌ Error checking expired subscriptions:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Log subscription event
   */
  async logSubscriptionEvent(restaurantId, planId, eventType, eventData = {}) {
    try {
      const { error } = await supabase
        .from('subscription_events')
        .insert({
          restaurant_id: restaurantId,
          plan_id: planId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      return { success: true }
    } catch (err) {
      console.error('❌ Error logging subscription event:', err)
      return { success: false }
    }
  },

  /**
   * Get trial configuration
   */
  async getTrialConfiguration() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('trial_enabled, trial_days, trial_plan_id, subscription_plans!trial_plan_id(name)')
        .eq('slug', 'free')
        .eq('is_active', true)
        .single()

      if (error) throw error

      return {
        data,
        error: null
      }
    } catch (err) {
      console.error('❌ Error getting trial configuration:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Update trial configuration
   */
  async updateTrialConfiguration(trialEnabled, trialDays, trialPlanId) {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update({
          trial_enabled: trialEnabled,
          trial_days: trialDays,
          trial_plan_id: trialPlanId,
          updated_at: new Date().toISOString()
        })
        .eq('slug', 'free')
        .select()
        .single()

      if (error) throw error

      return {
        data,
        error: null
      }
    } catch (err) {
      console.error('❌ Error updating trial configuration:', err)
      return {
        data: null,
        error: err
      }
    }
  },

  /**
   * Manually trigger expiration of all subscriptions
   * This function calls the PostgreSQL function created in Migration 18
   * to expire trial periods and temporary upgrades
   */
  async manuallyExpireSubscriptions() {
    try {
      console.log('🔄 Manually triggering subscription expiration...')

      const { data, error } = await supabase
        .rpc('expire_all_subscriptions')

      if (error) {
        console.error('❌ Error expiring subscriptions:', error)
        throw error
      }

      console.log('✅ Expiration completed:', data)

      return {
        success: true,
        data
      }
    } catch (err) {
      console.error('❌ Error in manuallyExpireSubscriptions:', err)
      return {
        success: false,
        error: err.message || 'Unknown error'
      }
    }
  }
}

export default subscriptionManagementService
