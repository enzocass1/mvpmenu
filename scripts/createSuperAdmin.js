/**
 * Create Super Admin Account
 *
 * Crea il primo account Super Admin con credenziali sicure
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const supabaseUrl = 'https://nfpgqvnfmypeyrlplqem.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcGdxdm5mbXlwZXlybHBscWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDE0OTMsImV4cCI6MjA3NjAxNzQ5M30.1WynYpt8Q_0I8g7CTl0Dgnf5f6qAVgFWo-gfWGFMZvE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Super Admin Details
const SUPER_ADMIN = {
  email: 'enzocassese91@gmail.com',
  name: 'Enzo Cassese',
}

/**
 * Generate secure random password
 */
function generatePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''

  const randomBytes = crypto.randomBytes(length)

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length]
  }

  return password
}

/**
 * Create Super Admin
 */
async function createSuperAdmin() {
  console.log('🔐 Creando Super Admin Account...\n')

  try {
    // Check if admin already exists
    const { data: existing, error: checkError } = await supabase
      .from('super_admins')
      .select('id, email')
      .eq('email', SUPER_ADMIN.email)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Error checking existing admin:', checkError.message)
      return
    }

    if (existing) {
      console.log('⚠️  Super Admin già esistente!')
      console.log(`   Email: ${existing.email}`)
      console.log(`   ID: ${existing.id}`)
      console.log('\n💡 Se vuoi resettare la password, elimina prima il record e riesegui lo script.\n')
      return
    }

    // Generate password
    const password = generatePassword(16)
    console.log('🔑 Password generata...')

    // Hash password
    console.log('🔒 Hash password in corso...')
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert Super Admin
    console.log('💾 Creando record nel database...')
    const { data, error } = await supabase
      .from('super_admins')
      .insert([{
        email: SUPER_ADMIN.email,
        name: SUPER_ADMIN.name,
        password_hash: passwordHash,
        is_active: true,
        permissions: ['*'], // Full access
        two_factor_enabled: false, // Puoi abilitare dopo
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating super admin:', error.message)
      return
    }

    console.log('\n' + '='.repeat(80))
    console.log('🎉 SUPER ADMIN CREATO CON SUCCESSO!')
    console.log('='.repeat(80))
    console.log('\n📧 EMAIL:')
    console.log(`   ${SUPER_ADMIN.email}`)
    console.log('\n🔑 PASSWORD (salvala in un posto sicuro!):')
    console.log(`   ${password}`)
    console.log('\n👤 NOME:')
    console.log(`   ${SUPER_ADMIN.name}`)
    console.log('\n🆔 ID:')
    console.log(`   ${data.id}`)
    console.log('\n✅ PERMESSI:')
    console.log('   * (Wildcard - Accesso completo a tutto)')
    console.log('\n🔐 2FA:')
    console.log('   ❌ Non abilitato (puoi abilitarlo dopo il primo login)')
    console.log('\n📍 PROSSIMI PASSI:')
    console.log('   1. Salva la password in un password manager')
    console.log('   2. Accedi al Super Admin Panel')
    console.log('   3. Cambia la password dopo il primo login')
    console.log('   4. (Opzionale) Abilita 2FA per sicurezza extra')
    console.log('\n' + '='.repeat(80))
    console.log('\n')

    // Log creation event
    await supabase
      .from('super_admin_logs')
      .insert([{
        super_admin_id: data.id,
        action: 'super_admin.created',
        changes: {
          email: SUPER_ADMIN.email,
          name: SUPER_ADMIN.name,
          created_via: 'script',
        }
      }])

    console.log('✅ Audit log registrato\n')

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

createSuperAdmin()
