/**
 * Verify Migration 14 Success
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nfpgqvnfmypeyrlplqem.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcGdxdm5mbXlwZXlybHBscWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDE0OTMsImV4cCI6MjA3NjAxNzQ5M30.1WynYpt8Q_0I8g7CTl0Dgnf5f6qAVgFWo-gfWGFMZvE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verify() {
  console.log('🔍 Verificando Migration 14...\n')

  const results = {
    tables: {},
    plans: [],
    features: [],
    restaurants: []
  }

  // Check tables
  const tablesToCheck = [
    'subscription_plans',
    'feature_flags',
    'super_admins',
    'subscription_events',
    'super_admin_logs',
    'revenue_analytics'
  ]

  console.log('📊 TABELLE CREATE:\n')
  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`  ❌ ${table}: ERROR - ${error.message}`)
        results.tables[table] = { status: 'error', error: error.message }
      } else {
        console.log(`  ✅ ${table}: OK (${count} records)`)
        results.tables[table] = { status: 'ok', count }
      }
    } catch (err) {
      console.log(`  ❌ ${table}: EXCEPTION - ${err.message}`)
      results.tables[table] = { status: 'error', error: err.message }
    }
  }

  // Check plans
  console.log('\n\n📦 PIANI CREATI:\n')
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('name, slug, price_monthly, is_visible, is_legacy, features')
      .order('sort_order')

    if (error) throw error

    if (plans && plans.length > 0) {
      plans.forEach(plan => {
        const visibility = plan.is_legacy ? '(Legacy)' : plan.is_visible ? '(Pubblico)' : '(Nascosto)'
        const featuresCount = Array.isArray(plan.features) ? plan.features.length : 0
        console.log(`  • ${plan.name.padEnd(20)} - €${String(plan.price_monthly).padEnd(5)}/mese ${visibility} - ${featuresCount} features`)
      })
      results.plans = plans
    } else {
      console.log('  ⚠️  Nessun piano trovato!')
    }
  } catch (err) {
    console.log(`  ❌ Errore: ${err.message}`)
  }

  // Check features
  console.log('\n\n🎯 FEATURE FLAGS:\n')
  try {
    const { data: features, error } = await supabase
      .from('feature_flags')
      .select('category, key, name')
      .eq('is_active', true)
      .order('category')

    if (error) throw error

    if (features && features.length > 0) {
      // Group by category
      const grouped = features.reduce((acc, f) => {
        if (!acc[f.category]) acc[f.category] = []
        acc[f.category].push(f)
        return acc
      }, {})

      Object.entries(grouped).forEach(([category, feats]) => {
        console.log(`  ${category.toUpperCase()}:`)
        feats.forEach(f => {
          console.log(`    - ${f.key}`)
        })
      })

      console.log(`\n  TOTALE: ${features.length} features`)
      results.features = features
    } else {
      console.log('  ⚠️  Nessuna feature trovata!')
    }
  } catch (err) {
    console.log(`  ❌ Errore: ${err.message}`)
  }

  // Check restaurants migration
  console.log('\n\n🏢 RISTORANTI MIGRATI:\n')
  try {
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('name, subdomain, subscription_tier, subscription_plan_id, subscription_plans(name, slug)')

    if (error) throw error

    if (restaurants && restaurants.length > 0) {
      restaurants.forEach(r => {
        const planName = r.subscription_plans?.name || 'N/A'
        const migrated = r.subscription_plan_id ? '✅' : '❌'
        console.log(`  ${migrated} ${r.name.padEnd(25)} (@${r.subdomain.padEnd(10)}) - Tier: ${r.subscription_tier?.padEnd(10)} → Piano: ${planName}`)
      })

      const migratedCount = restaurants.filter(r => r.subscription_plan_id).length
      console.log(`\n  MIGRATI: ${migratedCount}/${restaurants.length}`)

      results.restaurants = restaurants
    } else {
      console.log('  ⚠️  Nessun ristorante trovato!')
    }
  } catch (err) {
    console.log(`  ❌ Errore: ${err.message}`)
  }

  // Summary
  console.log('\n\n' + '='.repeat(80))
  console.log('📋 RIEPILOGO MIGRAZIONE')
  console.log('='.repeat(80))

  const tablesOk = Object.values(results.tables).filter(t => t.status === 'ok').length
  const tablesTotal = Object.keys(results.tables).length
  console.log(`\n✅ Tabelle create: ${tablesOk}/${tablesTotal}`)
  console.log(`✅ Piani popolati: ${results.plans.length}/4`)
  console.log(`✅ Features popolate: ${results.features.length}/23`)
  console.log(`✅ Ristoranti migrati: ${results.restaurants.filter(r => r.subscription_plan_id).length}/${results.restaurants.length}`)

  if (tablesOk === tablesTotal && results.plans.length >= 3 && results.features.length >= 20) {
    console.log('\n🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!\n')
  } else {
    console.log('\n⚠️  Ci sono alcuni problemi da verificare.\n')
  }

  return results
}

verify()
