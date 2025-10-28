/**
 * Check restaurants table schema
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nfpgqvnfmypeyrlplqem.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcGdxdm5mbXlwZXlybHBscWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDE0OTMsImV4cCI6MjA3NjAxNzQ5M30.1WynYpt8Q_0I8g7CTl0Dgnf5f6qAVgFWo-gfWGFMZvE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  console.log('🔍 Checking restaurants table structure...\n')

  try {
    // Get one restaurant to see columns
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error:', error.message)
      return
    }

    if (data && data.length > 0) {
      console.log('✅ Restaurants table columns:')
      console.log(Object.keys(data[0]).join(', '))
      console.log('\n📊 Sample data:')
      console.log(JSON.stringify(data[0], null, 2))
    } else {
      console.log('⚠️  No restaurants found in database')
    }

    // Count total restaurants
    const { count, error: countError } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })

    if (!countError) {
      console.log(`\n📈 Total restaurants: ${count}`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkSchema()
