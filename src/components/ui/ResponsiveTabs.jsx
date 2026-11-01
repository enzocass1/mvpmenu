import React, { useState, useEffect } from 'react'
import { tokens } from '../../styles/tokens'
import Tabs from './Tabs'

/**
 * Navigazione a schede COERENTE e responsive:
 * - desktop: usa il componente <Tabs> condiviso
 * - mobile: un menu a tendina uniforme
 * Sostituisce il blocco `{isMobile ? <select> : <Tabs>}` ripetuto nelle pagine,
 * così la navigazione a schede è identica ovunque.
 */
function ResponsiveTabs({ tabs = [], activeTab, onChange, marginBottom = true }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const wrapStyle = marginBottom
    ? { marginBottom: isMobile ? tokens.spacing.lg : tokens.spacing.xl }
    : undefined

  return (
    <div style={wrapStyle}>
      {isMobile ? (
        <select value={activeTab} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
          {tabs.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      ) : (
        <Tabs tabs={tabs} activeTab={activeTab} onChange={onChange} />
      )}
    </div>
  )
}

const selectStyle = {
  width: '100%',
  padding: tokens.spacing.md,
  paddingRight: '40px',
  fontSize: tokens.typography.fontSize.base,
  fontWeight: tokens.typography.fontWeight.medium,
  color: tokens.colors.black,
  backgroundColor: tokens.colors.white,
  border: `${tokens.borders.width.thin} solid ${tokens.colors.gray[300]}`,
  borderRadius: tokens.borderRadius.md,
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
}

export default ResponsiveTabs
