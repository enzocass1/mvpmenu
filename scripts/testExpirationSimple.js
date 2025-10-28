/**
 * Simple Test: Expiration Functions
 * Tests the automatic expiration functions created in migration 18
 *
 * Usage: node scripts/testExpirationSimple.js
 */

import { createClient } from '@supabase/supabase-js'

// Read env variables from process.env (set by Vite)
const supabaseUrl = 'https://pnqnqjxrgxznjnnmykqe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBucW5xanhyZ3h6bmpubm15a3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzE4MzAsImV4cCI6MjA0NTEwNzgzMH0.yrNCY-rQ9SfZ-xOwsLaH62CrGCZIAd_bW0PphyN7aNY'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 Testing Expiration Functions\n')
console.log('=' .repeat(70))

async function test() {
  try {
    // 1. Check current state
    console.log('\n📊 CURRENT STATE:')
    console.log('-'.repeat(70))

    // Check active trials
    const { data: trials, error: trialsErr } = await supabase
      .from('restaurants')
      .select('id, name, subscription_status, subscription_trial_ends_at')
      .eq('subscription_status', 'trial')

    console.log(`\n🔍 Active Trials: ${trials?.length || 0}`)
    if (trials && trials.length > 0) {
      trials.forEach(t => {
        const endsAt = new Date(t.subscription_trial_ends_at)
        const now = new Date()
        const isExpired = endsAt < now
        console.log(`  - ${t.name}`)
        console.log(`    Ends: ${endsAt.toLocaleString('it-IT')}`)
        console.log(`    ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
      })
    }

    // Check active temporary upgrades
    const { data: upgrades, error: upgradesErr } = await supabase
      .from('temporary_upgrades')
      .select(`
        id,
        expires_at,
        is_active,
        restaurants (name)
      `)
      .eq('is_active', true)

    console.log(`\n🚀 Active Temporary Upgrades: ${upgrades?.length || 0}`)
    if (upgrades && upgrades.length > 0) {
      upgrades.forEach(u => {
        const expiresAt = new Date(u.expires_at)
        const now = new Date()
        const isExpired = expiresAt < now
        console.log(`  - ${u.restaurants?.name || 'Unknown'}`)
        console.log(`    Expires: ${expiresAt.toLocaleString('it-IT')}`)
        console.log(`    ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
      })
    }

    // 2. Run expiration function
    console.log('\n' + '='.repeat(70))
    console.log('🔄 RUNNING EXPIRATION FUNCTION...')
    console.log('='.repeat(70))

    const { data: result, error: expErr } = await supabase
      .rpc('expire_all_subscriptions')

    if (expErr) {
      console.error('\n❌ ERROR:', expErr.message)
      if (expErr.hint) console.error('Hint:', expErr.hint)
      if (expErr.details) console.error('Details:', expErr.details)
      throw expErr
    }

    // 3. Show results
    console.log('\n📊 EXPIRATION RESULTS:')
    console.log('-'.repeat(70))

    console.log('\n🔍 Trial Periods:')
    console.log(`  Expired: ${result.trial_periods?.expired_count || 0}`)
    if (result.trial_periods?.expired_restaurants) {
      result.trial_periods.expired_restaurants.forEach(r => {
        console.log(`  - ${r.name}`)
      })
    }

    console.log('\n🚀 Temporary Upgrades:')
    console.log(`  Expired: ${result.temporary_upgrades?.expired_count || 0}`)
    if (result.temporary_upgrades?.expired_upgrades) {
      result.temporary_upgrades.expired_upgrades.forEach(u => {
        console.log(`  - ${u.restaurant_name}`)
        console.log(`    ${u.temporary_plan} → ${u.original_plan}`)
      })
    }

    console.log('\n' + '='.repeat(70))
    console.log('✅ TEST COMPLETED!')
    console.log('='.repeat(70))

    console.log('\n💡 Next Steps:')
    console.log('  1. Configure pg_cron for automatic execution (see migration 18)')
    console.log('  2. Or manually run: SELECT expire_all_subscriptions();')
    console.log('  3. Recommended: Run daily at midnight or hourly\n')

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message)
    process.exit(1)
  }
}

test()
