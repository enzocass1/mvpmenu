// Visita di anteprima (anteprima dall'editor del tema o bozza da approvare con ?bozza=1):
// non va contata nelle statistiche del locale.
export function isPreviewVisit() {
  if (typeof window === 'undefined') return false
  const query = window.location.hash.split('?')[1] || window.location.search.slice(1)
  const p = new URLSearchParams(query)
  return p.get('preview') === '1' || p.has('previewLayout') || p.get('bozza') === '1'
}
