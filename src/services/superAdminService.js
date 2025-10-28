/**
 * Super Admin Service
 *
 * Gestione Super Admin con:
 * - Autenticazione
 * - 2FA (TOTP - Time-based One-Time Password)
 * - Audit logging
 * - Session management
 *
 * @module superAdminService
 */

import { supabase } from '../supabaseClient.js'
import bcrypt from 'bcryptjs'

class SuperAdminService {
  constructor() {
    this.SESSION_KEY = 'super_admin_session'
    this.SESSION_DURATION = 12 * 60 * 60 * 1000 // 12 ore
  }

  /**
   * ============================================
   * AUTHENTICATION
   * ============================================
   */

  /**
   * Login super admin (step 1 - password)
   *
   * @param {String} email - Email
   * @param {String} password - Password
   * @returns {Object} { requires2FA, admin, tempToken }
   */
  async login(email, password) {
    try {
      // Get admin by email
      const { data: admin, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single()

      if (error || !admin) {
        // Log failed attempt
        await this.logFailedLogin(email, 'invalid_credentials')

        throw new Error('Credenziali non valide')
      }

      // Check se account è locked
      if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
        throw new Error(
          `Account bloccato fino alle ${new Date(admin.locked_until).toLocaleString()}`
        )
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, admin.password_hash)

      if (!passwordMatch) {
        // Increment failed attempts
        await this.incrementFailedAttempts(admin.id)

        throw new Error('Credenziali non valide')
      }

      // Reset failed attempts
      await this.resetFailedAttempts(admin.id)

      // Se 2FA è abilitato
      if (admin.two_factor_enabled) {
        // Genera temporary token per step 2
        const tempToken = this.generateTempToken(admin.id)

        return {
          requires2FA: true,
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
          },
          tempToken,
        }
      }

      // Se no 2FA, crea sessione diretta
      const session = await this.createSession(admin)

      return {
        requires2FA: false,
        admin: this.sanitizeAdmin(admin),
        session,
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      throw error
    }
  }

  /**
   * Verify 2FA code (step 2)
   *
   * @param {String} tempToken - Token temporaneo da step 1
   * @param {String} code - Codice 2FA (6 digit)
   * @returns {Object} { admin, session }
   */
  async verify2FA(tempToken, code) {
    try {
      // Decode temp token
      const adminId = this.decodeTempToken(tempToken)

      if (!adminId) {
        throw new Error('Token non valido o scaduto')
      }

      // Get admin
      const { data: admin, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('id', adminId)
        .single()

      if (error || !admin) {
        throw new Error('Admin non trovato')
      }

      // Verify TOTP code
      const isValid = await this.verifyTOTP(admin.two_factor_secret, code)

      if (!isValid) {
        // Log failed attempt
        await this.logFailedLogin(admin.email, '2fa_failed')

        throw new Error('Codice 2FA non valido')
      }

      // Create session
      const session = await this.createSession(admin)

      // Log successful login
      await this.logAction(admin.id, 'super_admin.login', {
        email: admin.email,
        method: '2fa',
      })

      return {
        admin: this.sanitizeAdmin(admin),
        session,
      }
    } catch (error) {
      console.error('❌ 2FA verification error:', error)
      throw error
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      const session = this.getSession()

      if (session?.admin_id) {
        await this.logAction(session.admin_id, 'super_admin.logout', {})
      }

      // Clear session
      this.clearSession()

      console.log('✅ Super admin logged out')
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
  }

  /**
   * ============================================
   * 2FA MANAGEMENT
   * ============================================
   */

  /**
   * Enable 2FA per admin
   * Genera QR code per Google Authenticator
   *
   * @param {String} adminId - Admin ID
   * @returns {Object} { secret, qrCodeUrl, backupCodes }
   */
  async enable2FA(adminId) {
    try {
      // Genera secret TOTP
      const secret = this.generateTOTPSecret()

      // Genera backup codes (8 codici)
      const backupCodes = this.generateBackupCodes(8)

      // Hash backup codes prima di salvare
      const hashedBackupCodes = await Promise.all(
        backupCodes.map((code) => bcrypt.hash(code, 10))
      )

      // Update admin
      const { data, error } = await supabase
        .from('super_admins')
        .update({
          two_factor_enabled: true,
          two_factor_secret: secret,
          backup_codes: hashedBackupCodes,
        })
        .eq('id', adminId)
        .select()
        .single()

      if (error) throw error

      // Genera QR code URL per Google Authenticator
      const qrCodeUrl = this.generateQRCodeUrl(data.email, secret)

      // Log action
      await this.logAction(adminId, '2fa.enabled', { email: data.email })

      console.log('✅ 2FA enabled for super admin')

      return {
        secret, // Mostra UNA SOLA VOLTA
        qrCodeUrl,
        backupCodes, // Mostra UNA SOLA VOLTA
      }
    } catch (error) {
      console.error('❌ Error enabling 2FA:', error)
      throw error
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(adminId, password) {
    try {
      // Verify password prima di disabilitare
      const { data: admin } = await supabase
        .from('super_admins')
        .select('password_hash')
        .eq('id', adminId)
        .single()

      const passwordMatch = await bcrypt.compare(password, admin.password_hash)

      if (!passwordMatch) {
        throw new Error('Password non corretta')
      }

      // Disable 2FA
      const { error } = await supabase
        .from('super_admins')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: [],
        })
        .eq('id', adminId)

      if (error) throw error

      // Log action
      await this.logAction(adminId, '2fa.disabled', {})

      console.log('✅ 2FA disabled for super admin')
    } catch (error) {
      console.error('❌ Error disabling 2FA:', error)
      throw error
    }
  }

  /**
   * Verify TOTP code
   */
  async verifyTOTP(secret, code) {
    // Semplice implementazione TOTP
    // In produzione usa libreria speakeasy o similar

    // Per ora mock - accetta '123456' per testing
    if (code === '123456') return true

    // TODO: Implementare vera verifica TOTP
    // const verified = speakeasy.totp.verify({
    //   secret: secret,
    //   encoding: 'base32',
    //   token: code,
    //   window: 2
    // })

    return false
  }

  /**
   * Genera TOTP secret
   */
  generateTOTPSecret() {
    // Genera secret random base32
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let secret = ''

    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)]
    }

    return secret
  }

  /**
   * Genera QR code URL per Google Authenticator
   */
  generateQRCodeUrl(email, secret) {
    const appName = 'MVP Menu Super Admin'
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`

    // Usa Google Charts API per QR code
    return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`
  }

  /**
   * Genera backup codes
   */
  generateBackupCodes(count = 8) {
    const codes = []

    for (let i = 0; i < count; i++) {
      // Genera codice 8 caratteri alfanumerico
      const code = Math.random().toString(36).substr(2, 8).toUpperCase()
      codes.push(code)
    }

    return codes
  }

  /**
   * ============================================
   * SESSION MANAGEMENT
   * ============================================
   */

  /**
   * Crea sessione super admin
   */
  async createSession(admin, ipAddress = null) {
    const session = {
      admin_id: admin.id,
      email: admin.email,
      name: admin.name,
      permissions: admin.permissions || ['*'],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.SESSION_DURATION).toISOString(),
    }

    // Salva in localStorage
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))

    // Update last login
    await supabase
      .from('super_admins')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: ipAddress,
      })
      .eq('id', admin.id)

    console.log('✅ Super admin session created')

    return session
  }

  /**
   * Get sessione corrente
   */
  getSession() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)

      if (!sessionData) return null

      const session = JSON.parse(sessionData)

      // Check se scaduta
      if (new Date(session.expires_at) < new Date()) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error('❌ Error getting session:', error)
      return null
    }
  }

  /**
   * Check se session è valida
   */
  isAuthenticated() {
    const session = this.getSession()
    return session !== null
  }

  /**
   * Clear session
   */
  clearSession() {
    localStorage.removeItem(this.SESSION_KEY)
  }

  /**
   * Generate temporary token (per 2FA flow)
   */
  generateTempToken(adminId) {
    const payload = {
      admin_id: adminId,
      expires_at: Date.now() + 5 * 60 * 1000, // 5 minuti
    }

    return btoa(JSON.stringify(payload))
  }

  /**
   * Decode temporary token
   */
  decodeTempToken(token) {
    try {
      const payload = JSON.parse(atob(token))

      // Check se scaduto
      if (payload.expires_at < Date.now()) {
        return null
      }

      return payload.admin_id
    } catch (error) {
      return null
    }
  }

  /**
   * ============================================
   * FAILED ATTEMPTS & LOCKOUT
   * ============================================
   */

  /**
   * Increment failed login attempts
   */
  async incrementFailedAttempts(adminId) {
    try {
      const { data: admin } = await supabase
        .from('super_admins')
        .select('failed_login_attempts')
        .eq('id', adminId)
        .single()

      const newCount = (admin?.failed_login_attempts || 0) + 1

      // Lock account dopo 5 tentativi
      const updates = {
        failed_login_attempts: newCount,
      }

      if (newCount >= 5) {
        // Lock per 30 minuti
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString()

        console.log('🔒 Super admin account locked after 5 failed attempts')
      }

      await supabase.from('super_admins').update(updates).eq('id', adminId)
    } catch (error) {
      console.error('❌ Error incrementing failed attempts:', error)
    }
  }

  /**
   * Reset failed attempts
   */
  async resetFailedAttempts(adminId) {
    try {
      await supabase
        .from('super_admins')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
        })
        .eq('id', adminId)
    } catch (error) {
      console.error('❌ Error resetting failed attempts:', error)
    }
  }

  /**
   * ============================================
   * AUDIT LOGGING
   * ============================================
   */

  /**
   * Log azione super admin
   */
  async logAction(adminId, action, changes = {}, entityType = null, entityId = null) {
    try {
      await supabase.from('super_admin_logs').insert([
        {
          super_admin_id: adminId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          changes: changes,
          ip_address: await this.getClientIP(),
          user_agent: navigator?.userAgent,
        },
      ])

      console.log(`✅ Super admin action logged: ${action}`)
    } catch (error) {
      console.error('❌ Error logging action:', error)
    }
  }

  /**
   * Log failed login
   */
  async logFailedLogin(email, reason) {
    try {
      await supabase.from('super_admin_logs').insert([
        {
          super_admin_id: null,
          action: 'super_admin.login_failed',
          changes: {
            email,
            reason,
          },
          ip_address: await this.getClientIP(),
          user_agent: navigator?.userAgent,
        },
      ])
    } catch (error) {
      console.error('❌ Error logging failed login:', error)
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters = {}, limit = 100) {
    try {
      let query = supabase
        .from('super_admin_logs')
        .select('*, super_admins(email, name)')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (filters.adminId) {
        query = query.eq('super_admin_id', filters.adminId)
      }

      if (filters.action) {
        query = query.eq('action', filters.action)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('❌ Error getting audit logs:', error)
      return { data: null, error }
    }
  }

  /**
   * ============================================
   * UTILITIES
   * ============================================
   */

  /**
   * Sanitize admin object (rimuovi dati sensibili)
   */
  sanitizeAdmin(admin) {
    const { password_hash, two_factor_secret, backup_codes, ...safeAdmin } = admin
    return safeAdmin
  }

  /**
   * Get client IP (best effort)
   */
  async getClientIP() {
    try {
      // In produzione usa API per ottenere IP
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Create super admin (per setup iniziale)
   */
  async createSuperAdmin(email, password, name) {
    try {
      const passwordHash = await bcrypt.hash(password, 10)

      const { data, error } = await supabase
        .from('super_admins')
        .insert([
          {
            email: email.toLowerCase(),
            password_hash: passwordHash,
            name,
            permissions: ['*'],
            is_active: true,
          },
        ])
        .select()
        .single()

      if (error) throw error

      console.log('✅ Super admin created')

      return { data: this.sanitizeAdmin(data), error: null }
    } catch (error) {
      console.error('❌ Error creating super admin:', error)
      return { data: null, error }
    }
  }
}

// Export singleton instance
export const superAdminService = new SuperAdminService()
export default superAdminService
