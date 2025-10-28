/**
 * Quick script to check temporary upgrade status
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nfpgqvnfmypeyrlplqem.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcGdxdm5mbXlwZXlybHBscWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDE0OTMsImV4cCI6MjA3NjAxNzQ5M30.1WynYpt8Q_0I8g7CTl0Dgnf5f6qAVgFWo-gfWGFMZvE'
)

async function checkTempUpgrade() {
  console.log('🔍 Checking temporary upgrades...\n')

  // Get all temporary upgrades
  const { data: upgrades, error: upgradesError } = await supabase
    .from('temporary_upgrades')
    .select(`
      *,
      restaurant:restaurants!temporary_upgrades_restaurant_id_fkey(id, name, subscription_plan_id),
      temp_plan:subscription_plans!temporary_upgrades_temporary_plan_id_fkey(id, name, slug)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  if (upgradesError) {
    console.error('❌ Error:', upgradesError)
    return
  }

  console.log(`Found ${upgrades?.length || 0} temporary upgrades:\n`)

  for (const upgrade of upgrades || []) {
    console.log('─────────────────────────────────────')
    console.log(`Restaurant: ${upgrade.restaurant?.name || 'Unknown'}`)
    console.log(`Temporary Plan: ${upgrade.temp_plan?.name || 'Unknown'}`)
    console.log(`Active: ${upgrade.is_active}`)
    console.log(`Expires: ${new Date(upgrade.expires_at).toLocaleString('it-IT')}`)
    console.log(`Reason: ${upgrade.reason || 'N/A'}`)
    console.log(`Created: ${new Date(upgrade.created_at).toLocaleString('it-IT')}`)

    // Check if restaurant actually has this plan
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('subscription_plan_id, subscription_plans(name)')
      .eq('id', upgrade.restaurant_id)
      .single()

    console.log(`Restaurant Current Plan: ${restaurant?.subscription_plans?.name || 'Unknown'}`)
    console.log(`Match: ${restaurant?.subscription_plan_id === upgrade.temporary_plan_id ? '✅ YES' : '❌ NO'}`)
  }

  console.log('─────────────────────────────────────\n')
}

checkTempUpgrade()
