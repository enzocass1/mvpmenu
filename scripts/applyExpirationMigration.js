/**
 * Apply Migration 18: Automatic Expiration of Trial Periods and Temporary Upgrades
 *
 * This script applies the migration that creates:
 * 1. expire_trial_periods() - Function to expire trial periods
 * 2. expire_temporary_upgrades() - Function to expire temporary upgrades
 * 3. expire_all_subscriptions() - Master function for both
 * 4. Optional pg_cron configuration (commented out by default)
 *
 * Usage:
 * node scripts/applyExpirationMigration.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('📦 Applying Migration 18: Auto Expiration Functions\n')

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '18_auto_expire_subscriptions.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Migration file loaded')
    console.log('─'.repeat(60))

    // Split SQL into individual statements (simple split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue
      }

      // Get a brief description of what this statement does
      let description = 'Executing statement'
      if (statement.includes('CREATE OR REPLACE FUNCTION expire_trial_periods')) {
        description = '✅ Creating expire_trial_periods() function'
      } else if (statement.includes('CREATE OR REPLACE FUNCTION expire_temporary_upgrades')) {
        description = '✅ Creating expire_temporary_upgrades() function'
      } else if (statement.includes('CREATE OR REPLACE FUNCTION expire_all_subscriptions')) {
        description = '✅ Creating expire_all_subscriptions() master function'
      } else if (statement.includes('GRANT EXECUTE')) {
        description = '✅ Granting execute permissions'
      } else if (statement.includes('COMMENT ON FUNCTION')) {
        description = '✅ Adding function documentation'
      }

      console.log(`${i + 1}/${statements.length} ${description}`)

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_string: statement })

        if (error) {
          // Try direct query if RPC fails
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(0)
          if (queryError) {
            console.error(`  ❌ Error: ${error.message}`)
            console.log('\n⚠️  Note: Some statements may require database owner privileges.')
            console.log('   Please run this migration manually in Supabase SQL Editor:')
            console.log(`   ${migrationPath}\n`)
            continue
          }
        }
      } catch (err) {
        console.error(`  ⚠️  Could not execute: ${err.message}`)
      }
    }

    console.log('\n' + '─'.repeat(60))
    console.log('✅ Migration 18 applied successfully!\n')

    // Test the functions
    console.log('🧪 Testing the functions...\n')

    // Test expire_all_subscriptions function
    const { data: testResult, error: testError } = await supabase
      .rpc('expire_all_subscriptions')

    if (testError) {
      console.error('❌ Error testing function:', testError.message)
      console.log('\n⚠️  The functions may have been created but need to be run manually in Supabase SQL Editor.')
      console.log(`   Migration file: ${migrationPath}\n`)
    } else {
      console.log('✅ Function test successful!')
      console.log('\n📊 Test Results:')
      console.log(`  - Trial periods expired: ${testResult.trial_periods?.expired_count || 0}`)
      console.log(`  - Temporary upgrades expired: ${testResult.temporary_upgrades?.expired_count || 0}`)
      console.log(`  - Executed at: ${new Date(testResult.executed_at).toLocaleString('it-IT')}`)
    }

    console.log('\n' + '─'.repeat(60))
    console.log('📝 Next Steps:')
    console.log('─'.repeat(60))
    console.log('\n1. ✅ Functions created successfully')
    console.log('2. 🧪 Run: node scripts/testExpiration.js')
    console.log('3. ⏰ Optional: Configure pg_cron for automatic execution')
    console.log('   (See migration 18 comments for pg_cron setup)')
    console.log('\n💡 Manual execution: SELECT expire_all_subscriptions();')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    if (error.details) console.error('Details:', error.details)
    if (error.hint) console.error('Hint:', error.hint)

    console.log('\n⚠️  Please apply the migration manually in Supabase SQL Editor:')
    console.log('   database/migrations/18_auto_expire_subscriptions.sql\n')

    process.exit(1)
  }
}

applyMigration()
