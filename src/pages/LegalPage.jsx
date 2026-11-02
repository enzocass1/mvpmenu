import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LEGAL_DOCS, LEGAL_LAST_UPDATE, LEGAL_CONTACT_EMAIL } from '../lib/legalDocs'

/**
 * Pagina pubblica per i documenti legali: /#/privacy e /#/termini.
 * I testi stanno in src/lib/legalDocs.js.
 */
function LegalPage({ doc }) {
  const d = LEGAL_DOCS[doc]
  useEffect(() => { window.scrollTo(0, 0) }, [doc])
  if (!d) return null

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#000', fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif" }}>
      <header style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link to="/landing" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#000' }}>
            <img src="/icon-192.png" alt="" width="32" height="32" style={{ borderRadius: 8 }} />
            <strong style={{ fontSize: 17 }}>MVP Menu</strong>
          </Link>
          <nav style={{ display: 'flex', gap: 16, fontSize: 14 }}>
            <Link to="/privacy" style={{ color: doc === 'privacy' ? '#000' : '#6b7280', fontWeight: doc === 'privacy' ? 700 : 500, textDecoration: 'none' }}>Privacy</Link>
            <Link to="/termini" style={{ color: doc === 'termini' ? '#000' : '#6b7280', fontWeight: doc === 'termini' ? 700 : 500, textDecoration: 'none' }}>Condizioni</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px 64px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Documenti legali</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.15 }}>{d.title}</h1>
        <p style={{ margin: '0 0 28px', fontSize: 16, color: '#4b5563', lineHeight: 1.6 }}>{d.intro}</p>

        {d.blocks.map((b, i) => {
          if (b.h) return <h2 key={i} style={{ margin: '28px 0 10px', fontSize: 18, fontWeight: 800 }}>{b.h}</h2>
          if (b.list) return (
            <ul key={i} style={{ margin: '0 0 12px', paddingLeft: 20, color: '#374151', fontSize: 15, lineHeight: 1.65 }}>
              {b.list.map((li, j) => <li key={j} style={{ marginBottom: 6 }}>{li}</li>)}
            </ul>
          )
          return <p key={i} style={{ margin: '0 0 12px', color: '#374151', fontSize: 15, lineHeight: 1.65 }}>{b.p}</p>
        })}

        <div style={{ marginTop: 36, paddingTop: 18, borderTop: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          Ultimo aggiornamento: {LEGAL_LAST_UPDATE} · Contatti: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} style={{ color: '#000' }}>{LEGAL_CONTACT_EMAIL}</a>
        </div>
      </main>
    </div>
  )
}

export default LegalPage
