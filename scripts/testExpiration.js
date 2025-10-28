/**
 * Test Script: Automatic Expiration of Trial Periods and Temporary Upgrades
 *
 * This script tests the automatic expiration functions:
 * 1. expire_trial_periods() - Expires trial periods that have passed their end date
 * 2. expire_temporary_upgrades() - Expires temporary upgrades and restores original plans
 * 3. expire_all_subscriptions() - Master function that calls both
 *
 * Usage:
 * node scripts/testExpiration.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🧪 Testing Automatic Expiration Functions\n')

async function testExpiration() {
  try {
    console.log('📊 Current State BEFORE Expiration:')
    console.log('─'.repeat(60))

    // 1. Check current trial periods
    const { data: trialRestaurants, error: trialError } = await supabase
      .from('restaurants')
      .select('id, name, subscription_status, subscription_trial_ends_at')
      .eq('subscription_status', 'trial')
      .not('subscription_trial_ends_at', 'is', null)

    if (trialError) throw trialError

    console.log('\n🔍 Active Trial Periods:')
    if (trialRestaurants && trialRestaurants.length > 0) {
      trialRestaurants.forEach(r => {
        const endsAt = new Date(r.subscription_trial_ends_at)
        const isExpired = endsAt < new Date()
        console.log(`  - ${r.name}`)
        console.log(`    Ends: ${endsAt.toLocaleString('it-IT')}`)
        console.log(`    Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
      })
    } else {
      console.log('  (No active trials)')
    }

    // 2. Check current temporary upgrades
    const { data: tempUpgrades, error: upgradeError } = await supabase
      .from('temporary_upgrades')
      .select(`
        id,
        restaurant_id,
        expires_at,
        is_active,
        restaurants (name),
        original_plan:subscription_plans!temporary_upgrades_original_plan_id_fkey (name),
        temporary_plan:subscription_plans!temporary_upgrades_temporary_plan_id_fkey (name)
      `)
      .eq('is_active', true)

    if (upgradeError) throw upgradeError

    console.log('\n🚀 Active Temporary Upgrades:')
    if (tempUpgrades && tempUpgrades.length > 0) {
      tempUpgrades.forEach(u => {
        const expiresAt = new Date(u.expires_at)
        const isExpired = expiresAt < new Date()
        console.log(`  - ${u.restaurants?.name || 'Unknown'}`)
        console.log(`    Plan: ${u.original_plan?.name} → ${u.temporary_plan?.name}`)
        console.log(`    Expires: ${expiresAt.toLocaleString('it-IT')}`)
        console.log(`    Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
      })
    } else {
      console.log('  (No active temporary upgrades)')
    }

    console.log('\n' + '─'.repeat(60))
    console.log('🔄 Running Expiration Function...\n')

    // 3. Run the expiration function
    const { data: result, error: expirationError } = await supabase
      .rpc('expire_all_subscriptions')

    if (expirationError) {
      console.error('❌ Error running expiration:', expirationError)
      throw expirationError
    }

    // 4. Display results
    console.log('📊 Expiration Results:')
    console.log('─'.repeat(60))

    console.log('\n🔍 Trial Periods:')
    console.log(`  Expired count: ${result.trial_periods?.expired_count || 0}`)
    if (result.trial_periods?.expired_restaurants?.length > 0) {
      result.trial_periods.expired_restaurants.forEach(r => {
        console.log(`  - ${r.name}`)
        console.log(`    Trial ended: ${new Date(r.trial_ended_at).toLocaleString('it-IT')}`)
      })
    } else {
      console.log('  (No trial periods expired)')
    }

    console.log('\n🚀 Temporary Upgrades:')
    console.log(`  Expired count: ${result.temporary_upgrades?.expired_count || 0}`)
    if (result.temporary_upgrades?.expired_upgrades?.length > 0) {
      result.temporary_upgrades.expired_upgrades.forEach(u => {
        console.log(`  - ${u.restaurant_name}`)
        console.log(`    Restored: ${u.temporary_plan} → ${u.original_plan}`)
        console.log(`    Expired: ${new Date(u.expired_at).toLocaleString('it-IT')}`)
      })
    } else {
      console.log('  (No temporary upgrades expired)')
    }

    console.log('\n' + '─'.repeat(60))
    console.log('📊 Current State AFTER Expiration:')
    console.log('─'.repeat(60))

    // 5. Check state after expiration
    const { data: afterTrials } = await supabase
      .from('restaurants')
      .select('id, name, subscription_status, subscription_trial_ends_at')
      .eq('subscription_status', 'expired')
      .not('subscription_trial_ends_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5)

    console.log('\n🔍 Recently Expired Trials:')
    if (afterTrials && afterTrials.length > 0) {
      afterTrials.forEach(r => {
        console.log(`  - ${r.name}`)
        console.log(`    Trial ended: ${new Date(r.subscription_trial_ends_at).toLocaleString('it-IT')}`)
      })
    } else {
      console.log('  (No expired trials)')
    }

    const { data: afterUpgrades } = await supabase
      .from('temporary_upgrades')
      .select(`
        id,
        expires_at,
        is_active,
        restaurants (name),
        original_plan:subscription_plans!temporary_upgrades_original_plan_id_fkey (name),
        temporary_plan:subscription_plans!temporary_upgrades_temporary_plan_id_fkey (name)
      `)
      .eq('is_active', false)
      .lt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(5)

    console.log('\n🚀 Recently Expired Upgrades:')
    if (afterUpgrades && afterUpgrades.length > 0) {
      afterUpgrades.forEach(u => {
        console.log(`  - ${u.restaurants?.name || 'Unknown'}`)
        console.log(`    Plan: ${u.temporary_plan?.name} → ${u.original_plan?.name}`)
        console.log(`    Expired: ${new Date(u.expires_at).toLocaleString('it-IT')}`)
      })
    } else {
      console.log('  (No expired upgrades)')
    }

    console.log('\n' + '─'.repeat(60))
    console.log('✅ Test completed successfully!')
    console.log('\n💡 Note: This function should be run automatically by pg_cron.')
    console.log('   Check migration 18 for pg_cron setup instructions.')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    if (error.details) console.error('Details:', error.details)
    if (error.hint) console.error('Hint:', error.hint)
    process.exit(1)
  }
}

testExpiration()
