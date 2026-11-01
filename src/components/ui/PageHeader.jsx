import React, { useState, useEffect } from 'react'
import { tokens } from '../../styles/tokens'

/**
 * Intestazione di pagina COERENTE per tutte le schermate admin.
 * Titolo + sottotitolo con tipografia, colori e spazi uniformi (responsive).
 * Opzionale `actions` a destra (pulsanti). Usare sempre questo invece di
 * ri-dichiarare stili di intestazione in ogni pagina.
 */
function PageHeader({ title, subtitle, actions }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: tokens.spacing.md,
      flexWrap: 'wrap',
      marginBottom: isMobile ? tokens.spacing.lg : tokens.spacing.xl,
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{
          margin: 0,
          marginBottom: subtitle ? tokens.spacing.xs : 0,
          fontSize: isMobile ? tokens.typography.fontSize['2xl'] : tokens.typography.fontSize['3xl'],
          fontWeight: tokens.typography.fontWeight.bold,
          color: tokens.colors.black,
          lineHeight: tokens.typography.lineHeight.tight,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            margin: 0,
            fontSize: isMobile ? tokens.typography.fontSize.sm : tokens.typography.fontSize.base,
            color: tokens.colors.gray[600],
            lineHeight: tokens.typography.lineHeight.normal,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ flexShrink: 0, display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export default PageHeader
