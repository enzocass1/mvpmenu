/**
 * Script per applicare la migration 15: Trial e Upgrade Temporanei
 *
 * Esegue la migration che aggiunge:
 * - Campi trial a subscription_plans
 * - Campo is_trial_used a restaurants
 * - Tabella temporary_upgrades
 * - Funzioni helper per gestione trial/upgrade
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variabili d\'ambiente mancanti!')
  console.error('Assicurati di avere:')
  console.error('- VITE_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🚀 Applicazione Migration 15: Trial e Upgrade Temporanei')
  console.log('================================================\n')

  try {
    // 1. Leggi il file SQL
    const migrationPath = join(__dirname, '../database/migrations/15_trial_and_temporary_upgrades.sql')
    console.log('📄 Lettura file migration...')
    const migrationSQL = readFileSync(migrationPath, 'utf8')

    // 2. Esegui la migration
    console.log('⚙️  Esecuzione migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL })

    if (error) {
      throw error
    }

    console.log('✅ Migration applicata con successo!\n')

    // 3. Verifica creazione tabelle/campi
    console.log('🔍 Verifica modifiche...\n')

    // Verifica subscription_plans
    const { data: planColumns, error: planError } = await supabase
      .from('subscription_plans')
      .select('trial_enabled, trial_days, trial_plan_id')
      .limit(1)

    if (!planError) {
      console.log('✅ Campi trial aggiunti a subscription_plans')
    }

    // Verifica restaurants
    const { data: restColumns, error: restError } = await supabase
      .from('restaurants')
      .select('is_trial_used')
      .limit(1)

    if (!restError) {
      console.log('✅ Campo is_trial_used aggiunto a restaurants')
    }

    // Verifica temporary_upgrades
    const { data: tempUpgrades, error: tempError } = await supabase
      .from('temporary_upgrades')
      .select('*')
      .limit(1)

    if (!tempError) {
      console.log('✅ Tabella temporary_upgrades creata')
    }

    console.log('\n🎉 Migration completata con successo!')
    console.log('\n📋 Prossimi step:')
    console.log('1. Configurare trial per piano FREE in Gestisci Piani')
    console.log('2. Testare registrazione nuovo utente con trial')
    console.log('3. Testare creazione upgrade temporaneo dal CRM')

  } catch (error) {
    console.error('\n❌ Errore durante la migration:')
    console.error(error.message)
    console.error('\nDettagli:', error)
    process.exit(1)
  }
}

// Esegui migration
applyMigration()
