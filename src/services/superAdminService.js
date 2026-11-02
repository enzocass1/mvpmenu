/**
 * Super Admin Service
 *
 * Il super admin è un normale utente Supabase Auth la cui email è presente
 * (e attiva) nella tabella super_admins. La verifica password avviene sul
 * server (Supabase Auth) e i dati sensibili sono protetti da RLS: le pagine
 * super-admin funzionano solo con un login vero, non basta aprire l'URL.
 *
 * @module superAdminService
 */

import { supabase } from '../supabaseClient.js'

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
   * Login super admin: email + password verificate da Supabase Auth,
   * poi controllo che l'account sia un super admin attivo.
   *
   * @returns {Object} { requires2FA: false, admin, session }
   */
  async login(email, password) {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      throw new Error('Credenziali non valide')
    }

    // L'account è un super admin attivo? (verificato lato server)
    const { data: admin, error: rpcError } = await supabase.rpc('current_super_admin')

    if (rpcError || !admin) {
      // Non autorizzato: chiudi la sessione appena creata
      await supabase.auth.signOut()
      this.clearSession()
      throw new Error('Questo account non è abilitato come super admin')
    }

    const session = this.createLocalSession(admin)

    await this.logAction(admin.id, 'super_admin.login', { email: admin.email })

    return { requires2FA: false, admin, session }
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
    } catch { /* il logout procede comunque */ }

    this.clearSession()
    await supabase.auth.signOut()
  }

  /**
   * ============================================
   * SESSION MANAGEMENT
   * ============================================
   * La sessione locale serve solo alla UI (nome, scadenza): la vera
   * autorizzazione la fa il database con RLS su ogni query.
   */

  createLocalSession(admin) {
    const session = {
      admin_id: admin.id,
      email: admin.email,
      name: admin.name,
      permissions: admin.permissions || ['*'],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.SESSION_DURATION).toISOString(),
    }
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
    return session
  }

  getSession() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (!sessionData) return null

      const session = JSON.parse(sessionData)
      if (new Date(session.expires_at) < new Date()) {
        this.clearSession()
        return null
      }
      return session
    } catch {
      return null
    }
  }

  isAuthenticated() {
    return this.getSession() !== null
  }

  /**
   * Controllo forte: sessione locale + login Supabase + ruolo super admin.
   * Da usare come guardia nelle pagine super-admin.
   */
  async checkAccess() {
    if (!this.isAuthenticated()) return false

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      this.clearSession()
      return false
    }

    const { data: isAdmin } = await supabase.rpc('is_super_admin')
    if (!isAdmin) {
      this.clearSession()
      return false
    }
    return true
  }

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY)
  }

  /**
   * ============================================
   * AUDIT LOGGING
   * ============================================
   */

  async logAction(adminId, action, changes = {}, entityType = null, entityId = null) {
    try {
      await supabase.from('super_admin_logs').insert([
        {
          super_admin_id: adminId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          changes,
          user_agent: navigator?.userAgent,
        },
      ])
    } catch (error) {
      console.error('❌ Error logging action:', error)
    }
  }

  async getAuditLogs(filters = {}, limit = 100) {
    try {
      let query = supabase
        .from('super_admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (filters.adminId) query = query.eq('super_admin_id', filters.adminId)
      if (filters.action) query = query.eq('action', filters.action)
      if (filters.startDate) query = query.gte('created_at', filters.startDate)
      if (filters.endDate) query = query.lte('created_at', filters.endDate)

      const { data, error } = await query
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('❌ Error getting audit logs:', error)
      return { data: null, error }
    }
  }
}

// Export singleton instance
export const superAdminService = new SuperAdminService()
export default superAdminService
