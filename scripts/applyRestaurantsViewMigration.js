/**
 * Apply Migration 16: Restaurants with Users View
 *
 * This migration creates a database function that allows Super Admin
 * to retrieve restaurants with user emails without exposing auth.users directly.
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('📝 Reading migration file...')
    const migrationPath = path.join(__dirname, '../database/migrations/16_restaurants_with_users_view.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('🚀 Applying migration 16...')

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql doesn't exist, we'll use a different approach
      console.log('⚠️  exec_sql not available, using direct query...')

      // Split by statement and execute each
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/**'))

      for (const statement of statements) {
        if (statement) {
          const { error: stmtError } = await supabase.rpc('exec', { query: statement })
          if (stmtError) {
            console.error('❌ Error executing statement:', stmtError)
            throw stmtError
          }
        }
      }
    }

    console.log('✅ Migration 16 applied successfully!')
    console.log('')
    console.log('📊 Created database function: get_restaurants_with_user_emails()')
    console.log('   This function allows Super Admin to fetch restaurants with user emails')

  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    console.error('')
    console.error('Please apply the migration manually:')
    console.error('1. Go to Supabase Dashboard > SQL Editor')
    console.error('2. Copy the content of database/migrations/16_restaurants_with_users_view.sql')
    console.error('3. Paste and run it in the SQL Editor')
    process.exit(1)
  }
}

applyMigration()
