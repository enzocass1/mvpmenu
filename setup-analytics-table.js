// Script per creare la tabella analytics_events in Supabase
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

// Carica variabili ambiente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Errore: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY non trovati in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupAnalyticsTable() {
  console.log('🚀 Inizio setup tabella analytics_events...\n')

  // Leggi il file SQL
  const sqlScript = fs.readFileSync('./supabase_analytics_schema.sql', 'utf8')

  console.log('📄 SQL Script caricato:')
  console.log('-----------------------------------')
  console.log(sqlScript)
  console.log('-----------------------------------\n')

  console.log('⚠️  NOTA: Questo script crea la tabella tramite Supabase SQL Editor.')
  console.log('📋 Copia il contenuto del file supabase_analytics_schema.sql')
  console.log('🔗 Vai su: https://supabase.com/dashboard/project/YOUR_PROJECT/editor')
  console.log('📝 Incolla ed esegui lo script SQL\n')

  console.log('✅ Setup completato! La tabella verrà creata dopo aver eseguito lo script in Supabase SQL Editor.')
}

setupAnalyticsTable()
