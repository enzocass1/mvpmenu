/**
 * Script per applicare Migration 14
 *
 * Esegue il file SQL della migration 14 sul database Supabase
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase config
const supabaseUrl = 'https://nfpgqvnfmypeyrlplqem.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcGdxdm5mbXlwZXlybHBscWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDE0OTMsImV4cCI6MjA3NjAxNzQ5M30.1WynYpt8Q_0I8g7CTl0Dgnf5f6qAVgFWo-gfWGFMZvE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function applyMigration() {
  console.log('🚀 Applying Migration 14: Subscription Plans System...\n')

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '14_subscription_plans_system.sql')

    console.log(`📂 Reading migration from: ${migrationPath}`)

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found!')
      console.log(`Expected path: ${migrationPath}`)
      process.exit(1)
    }

    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log(`✅ Migration file loaded (${sql.length} characters)\n`)

    // Split SQL by statements (rough split, works for most cases)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`)

    console.log('⚠️  IMPORTANTE: Questo script usa la anon key che potrebbe non avere permessi.')
    console.log('⚠️  Se fallisce, copia il contenuto del file SQL e eseguilo manualmente in Supabase Dashboard.\n')

    console.log('🔗 Supabase SQL Editor: https://supabase.com/dashboard/project/nfpgqvnfmypeyrlplqem/sql\n')

    // Try to execute
    console.log('🔄 Tentativo di esecuzione automatica...\n')

    // Execute full SQL in one go
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Errore durante l\'esecuzione automatica:', error.message)
      console.log('\n📋 ISTRUZIONI MANUALI:\n')
      console.log('1. Vai a: https://supabase.com/dashboard/project/nfpgqvnfmypeyrlplqem/sql')
      console.log('2. Apri il file: database/migrations/14_subscription_plans_system.sql')
      console.log('3. Copia tutto il contenuto')
      console.log('4. Incollalo nel SQL Editor di Supabase')
      console.log('5. Clicca "RUN"\n')

      console.log('📄 Oppure copia questo contenuto:\n')
      console.log('=' .repeat(80))
      console.log(sql.substring(0, 500) + '\n...[TRUNCATED]...')
      console.log('=' .repeat(80))
      console.log('\n✨ Il file completo è in: database/migrations/14_subscription_plans_system.sql\n')

      process.exit(1)
    }

    console.log('✅ Migration 14 applicata con successo!\n')

    // Verify tables created
    console.log('🔍 Verifica tabelle create...\n')

    const tablesToCheck = [
      'subscription_plans',
      'feature_flags',
      'super_admins',
      'subscription_events',
      'super_admin_logs',
      'revenue_analytics'
    ]

    for (const table of tablesToCheck) {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`❌ Tabella ${table}: NOT FOUND`)
      } else {
        console.log(`✅ Tabella ${table}: OK`)
      }
    }

    console.log('\n🎉 Migration completata!\n')

    // Show initial plans
    console.log('📊 Piani creati:\n')

    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('name, slug, price_monthly, is_visible, is_legacy')
      .order('sort_order')

    if (!plansError && plans) {
      plans.forEach(plan => {
        const visibility = plan.is_legacy ? '(Legacy)' : plan.is_visible ? '(Pubblico)' : '(Nascosto)'
        console.log(`  • ${plan.name} - €${plan.price_monthly}/mese ${visibility}`)
      })
    }

    console.log('\n✅ Sistema pronto per essere usato!\n')

  } catch (error) {
    console.error('❌ Errore generale:', error)
    process.exit(1)
  }
}

// Run
applyMigration()
