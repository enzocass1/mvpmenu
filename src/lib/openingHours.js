// Riga degli orari di apertura (tabella opening_hours: day_start/day_end, time_start_1/time_end_1, time_start_2/time_end_2),
// es. "Lunedì–Sabato 06:30–22:00" oppure "Domenica 07:30–13:00, 17:00–22:00"
export function formatOpeningHour(h) {
  const days = h.day_end && h.day_end !== h.day_start ? `${h.day_start}–${h.day_end}` : (h.day_start || '')
  const slots = [[h.time_start_1, h.time_end_1], [h.time_start_2, h.time_end_2]]
    .filter(([a, b]) => a && b)
    .map(([a, b]) => `${String(a).slice(0, 5)}–${String(b).slice(0, 5)}`)
  return `${days} ${slots.length ? slots.join(', ') : 'Chiuso'}`.trim()
}
