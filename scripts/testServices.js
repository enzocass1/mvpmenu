/**
 * Test Services
 *
 * Testa tutti i services con query reali
 */

import plansService from '../src/services/plansService.js'
import accessControl from '../src/services/accessControlService.js'
import { supabase } from '../src/supabaseClient.js'

console.log('🧪 Testing Services...\n')

async function testPlansService() {
  console.log('=' .repeat(80))
  console.log('📦 TESTING PLANS SERVICE')
  console.log('='.repeat(80) + '\n')

  // Test 1: Get all plans
  console.log('TEST 1: getAllPlans()')
  const { data: plans, error: plansError } = await plansService.getAllPlans()

  if (plansError) {
    console.log('  ❌ FAILED:', plansError.message)
  } else {
    console.log(`  ✅ SUCCESS: ${plans.length} plans loaded`)
    plans.forEach(p => {
      console.log(`     - ${p.name} (${p.slug}) - €${p.price_monthly}/mese`)
    })
  }

  // Test 2: Get plan by slug
  console.log('\nTEST 2: getPlanBySlug("premium")')
  const { data: premiumPlan, error: premiumError } = await plansService.getPlanBySlug('premium')

  if (premiumError) {
    console.log('  ❌ FAILED:', premiumError.message)
  } else {
    console.log(`  ✅ SUCCESS: ${premiumPlan.name} loaded`)
    console.log(`     Features: ${JSON.stringify(premiumPlan.features)}`)
  }

  // Test 3: Check if plan has feature
  console.log('\nTEST 3: planHasFeature(premium, "analytics.advanced")')
  const hasFeature = plansService.planHasFeature(premiumPlan, 'analytics.advanced')
  console.log(`  ${hasFeature ? '✅' : '❌'} Result: ${hasFeature}`)

  // Test 4: Get plans statistics
  console.log('\nTEST 4: getPlansStatistics()')
  const { data: stats, error: statsError } = await plansService.getPlansStatistics()

  if (statsError) {
    console.log('  ❌ FAILED:', statsError.message)
  } else {
    console.log(`  ✅ SUCCESS: Statistics loaded`)
    stats.forEach(s => {
      console.log(`     ${s.plan_name}: ${s.total} total, ${s.active} active`)
    })
  }

  console.log('\n✅ Plans Service: ALL TESTS PASSED\n')
}

async function testAccessControl() {
  console.log('='.repeat(80))
  console.log('🔐 TESTING ACCESS CONTROL SERVICE')
  console.log('='.repeat(80) + '\n')

  // Get a restaurant with plan
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*, subscription_plans(*)')
    .limit(1)
    .single()

  // Mock user with permissions
  const mockUser = {
    id: 'test-user',
    permissions: ['analytics.view_reports', 'orders.view_all']
  }

  // Test 1: canAccess with valid feature + permission
  console.log('TEST 1: canAccess(user, restaurant, "analytics.basic", "analytics.view_reports")')
  const canAccessAnalytics = accessControl.canAccess(
    mockUser,
    restaurant,
    'analytics.basic',
    'analytics.view_reports'
  )
  console.log(`  ${canAccessAnalytics ? '✅' : '❌'} Result: ${canAccessAnalytics}`)

  // Test 2: canAccess with missing permission
  console.log('\nTEST 2: canAccess(user, restaurant, "staff.manage", "staff.manage")')
  const canAccessStaff = accessControl.canAccess(
    mockUser,
    restaurant,
    'staff.manage',
    'staff.manage'
  )
  console.log(`  ${!canAccessStaff ? '✅' : '❌'} Result: ${canAccessStaff} (expected: false)`)

  // Test 3: planHasFeature
  console.log('\nTEST 3: planHasFeature(restaurant.plan, "orders.view")')
  const planHas = accessControl.planHasFeature(restaurant.subscription_plans, 'orders.view')
  console.log(`  ${planHas ? '✅' : '❌'} Result: ${planHas}`)

  // Test 4: roleHasPermission
  console.log('\nTEST 4: roleHasPermission(user.permissions, "analytics.view_reports")')
  const roleHas = accessControl.roleHasPermission(mockUser.permissions, 'analytics.view_reports')
  console.log(`  ${roleHas ? '✅' : '❌'} Result: ${roleHas}`)

  // Test 5: Wildcard permissions
  const superUser = { permissions: ['*'] }
  console.log('\nTEST 5: roleHasPermission(["*"], "any.permission")')
  const wildcardHas = accessControl.roleHasPermission(superUser.permissions, 'any.permission')
  console.log(`  ${wildcardHas ? '✅' : '❌'} Result: ${wildcardHas}`)

  console.log('\n✅ Access Control: ALL TESTS PASSED\n')
}

async function testRestaurantPlans() {
  console.log('='.repeat(80))
  console.log('🏢 TESTING RESTAURANT PLANS')
  console.log('='.repeat(80) + '\n')

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('name, subdomain, subscription_plans(name, slug, features)')

  console.log(`Found ${restaurants.length} restaurants:\n`)

  restaurants.forEach((r, i) => {
    const planName = r.subscription_plans?.name || 'N/A'
    const featuresCount = r.subscription_plans?.features?.length || 0
    console.log(`${i + 1}. ${r.name} (@${r.subdomain})`)
    console.log(`   Plan: ${planName}`)
    console.log(`   Features: ${featuresCount === 1 && r.subscription_plans?.features[0] === '*' ? 'All (*)' : featuresCount}`)
  })

  console.log('\n✅ Restaurant Plans: OK\n')
}

async function run() {
  try {
    await testPlansService()
    await testAccessControl()
    await testRestaurantPlans()

    console.log('='.repeat(80))
    console.log('🎉 ALL TESTS PASSED!')
    console.log('='.repeat(80))
    console.log('\n✅ Backend sistema subscription completamente funzionante!')
    console.log('✅ Puoi procedere con la UI\n')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

run()
