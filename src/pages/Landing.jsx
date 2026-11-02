import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { PRICING, FEATURE_GROUPS, DEMO_MENU_PATH } from '../lib/marketing'
import { notifyAdmin, ADMIN_EMAIL } from '../lib/adminNotify'

const Check = ({ size = 22, bg = '#000', color = '#fff' }) => (
  <span style={{ flexShrink: 0, width: size, height: size, borderRadius: '50%', background: bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
  </span>
)
const Box = () => (
  <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: 4, background: '#000', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
  </span>
)
const Phone = ({ src, alt, width }) => (
  <div className="lp-phone" style={{ width }}>
    <img src={src} alt={alt} loading="lazy" />
  </div>
)
const Browser = ({ src, alt, url }) => (
  <div className="lp-browser">
    <div className="lp-browser-bar"><i /><i /><i /><span>{url}</span></div>
    <img src={src} alt={alt} loading="lazy" />
  </div>
)

const EMPTY_FORM = { name: '', business_name: '', email: '', phone: '', city: '', message: '', privacy: false, website: '' }

function Landing() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const submitDemo = async (e) => {
    e.preventDefault()
    setError('')
    if (form.website) { setSent(true); return } // campo trappola compilato: probabile bot
    if (form.name.trim().length < 2) return setError('Inserisci il tuo nome.')
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Inserisci un\'email valida.')
    if (!form.privacy) return setError('Per inviare la richiesta devi accettare l\'informativa privacy.')
    setSending(true)
    try {
      const row = {
        name: form.name.trim(),
        business_name: form.business_name.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        message: form.message.trim() || null,
        privacy_accepted: true,
      }
      const { error: insertError } = await supabase.from('demo_requests').insert(row)
      if (insertError) throw insertError
      notifyAdmin(`Nuova richiesta demo: ${row.business_name || row.name}`, {
        Nome: row.name, Locale: row.business_name || '-', Email: row.email, Telefono: row.phone || '-', Citta: row.city || '-', Messaggio: row.message || '-',
      })
      setSent(true)
      setForm(EMPTY_FORM)
    } catch (err) {
      console.error('Errore richiesta demo:', err?.message)
      setError(`Invio non riuscito. Riprova oppure scrivici a ${ADMIN_EMAIL}.`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="lp">
      <style>{`
        .lp { background:#fff; color:#000; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; }
        .lp * { box-sizing:border-box; }
        .lp a { color:inherit; }
        .lp-wrap { max-width:1140px; margin:0 auto; padding:0 20px; }
        .lp-header { position:sticky; top:0; z-index:50; background:rgba(255,255,255,.96); backdrop-filter:blur(6px); border-bottom:1px solid #e5e7eb; }
        .lp-header .lp-wrap { display:flex; align-items:center; justify-content:space-between; gap:12px; height:64px; }
        .lp-nav { display:flex; align-items:center; gap:22px; font-size:14px; }
        .lp-nav-links { display:flex; gap:22px; }
        .lp-nav button { background:none; border:none; cursor:pointer; font-size:14px; color:#374151; padding:0; font-family:inherit; }
        .lp-btn { display:inline-flex; align-items:center; justify-content:center; padding:12px 20px; border-radius:10px; font-weight:700; font-size:15px; text-decoration:none; cursor:pointer; border:1.5px solid #000; line-height:1; font-family:inherit; }
        .lp-btn-dark { background:#000; color:#fff !important; }
        .lp-btn-light { background:#fff; color:#000 !important; }
        .lp-kicker { font-size:12px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#6b7280; margin-bottom:10px; }
        .lp-h2 { font-size:clamp(26px,4vw,38px); font-weight:800; letter-spacing:-.6px; line-height:1.12; margin:0 0 14px; }
        .lp-sub { font-size:17px; color:#4b5563; line-height:1.6; margin:0; }
        .lp-section { padding:84px 0; }
        .lp-section.gray { background:#f9fafb; border-top:1px solid #f3f4f6; border-bottom:1px solid #f3f4f6; }
        .lp-hero { display:grid; grid-template-columns:1.1fr .9fr; gap:40px; align-items:center; padding:64px 0 40px; }
        .lp-hero h1 { font-size:clamp(34px,5.4vw,60px); font-weight:800; letter-spacing:-1.4px; line-height:1.04; margin:0 0 18px; }
        .lp-phone { background:#000; border-radius:30px; padding:8px; box-shadow:0 24px 60px rgba(0,0,0,.22); }
        .lp-phone img { width:100%; display:block; border-radius:23px; }
        .lp-browser { border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; box-shadow:0 16px 44px rgba(0,0,0,.12); background:#fff; }
        .lp-browser-bar { height:30px; background:#f3f4f6; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; gap:7px; padding:0 14px; }
        .lp-browser-bar i { width:9px; height:9px; border-radius:50%; background:#d1d5db; display:block; }
        .lp-browser-bar span { margin-left:10px; font-size:11px; color:#9ca3af; background:#fff; border:1px solid #e5e7eb; border-radius:99px; padding:2px 12px; }
        .lp-browser img { width:100%; display:block; }
        .lp-themes { display:flex; justify-content:center; gap:28px; margin:44px 0 18px; flex-wrap:wrap; }
        .lp-theme-cap { text-align:center; font-weight:700; font-size:15px; margin-top:14px; }
        .lp-benefits { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; margin-top:40px; }
        .lp-benefit { display:flex; gap:12px; align-items:flex-start; font-size:15px; color:#374151; line-height:1.55; }
        .lp-benefit strong { color:#000; }
        .lp-an-row { display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-top:22px; }
        .lp-world { background:#000; color:#fff; border-radius:16px; padding:28px; display:flex; flex-direction:column; justify-content:center; }
        .lp-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; margin-top:36px; }
        .lp-step { border:1px solid #e5e7eb; border-radius:16px; padding:24px; background:#fff; }
        .lp-step-n { width:36px; height:36px; border-radius:50%; background:#000; color:#fff; font-weight:800; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px; }
        .lp-features { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:28px 32px; margin-top:36px; }
        .lp-fgroup h4 { margin:0 0 12px; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; padding-bottom:8px; border-bottom:1px solid #e5e7eb; }
        .lp-fi { display:flex; gap:10px; align-items:flex-start; font-size:15px; color:#374151; line-height:1.45; margin-bottom:9px; }
        .lp-prices { display:grid; grid-template-columns:1.15fr 1fr; gap:22px; max-width:760px; margin:30px auto 0; }
        .lp-price { border:2px solid #000; border-radius:18px; padding:28px; position:relative; }
        .lp-price.dark { background:#000; color:#fff; }
        .lp-ribbon { position:absolute; top:-13px; right:22px; background:#fff; color:#000; border:1.5px solid #000; border-radius:99px; font-size:12px; font-weight:800; padding:4px 12px; }
        .lp-form { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .lp-form label { display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px; }
        .lp-form input, .lp-form textarea { width:100%; padding:12px 13px; font-size:15px; border:1px solid #d1d5db; border-radius:10px; outline:none; font-family:inherit; background:#fff; color:#000; }
        .lp-form input:focus, .lp-form textarea:focus { border-color:#000; box-shadow:0 0 0 1px #000; }
        .lp-form .full { grid-column:1 / -1; }
        .lp-hp { position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden; }
        .lp-footer { border-top:1px solid #e5e7eb; padding:32px 0; font-size:14px; color:#6b7280; }
        @media (max-width: 900px) {
          .lp-nav .lp-nav-links { display:none; }
          .lp-hero { grid-template-columns:1fr; padding:40px 0 24px; text-align:left; }
          .lp-hero-phone { order:-1; }
          .lp-benefits, .lp-steps, .lp-an-row, .lp-prices { grid-template-columns:1fr; }
          .lp-section { padding:60px 0; }
          .lp-themes { gap:14px; }
          .lp-themes .lp-phone { width:150px !important; border-radius:22px; padding:5px; }
          .lp-themes .lp-phone img { border-radius:17px; }
          .lp-form { grid-template-columns:1fr; }
        }
        @media (max-width: 520px) {
          .lp-themes .lp-phone { width:105px !important; }
          .lp-header .lp-btn { padding:10px 13px; font-size:14px; }
        }
      `}</style>

      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-wrap">
          <Link to="/landing" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/icon-192.png" alt="" width="34" height="34" style={{ borderRadius: 9 }} />
            <strong style={{ fontSize: 18 }}>MVP Menu</strong>
          </Link>
          <nav className="lp-nav">
            <span className="lp-nav-links">
              <button onClick={() => scrollTo('funzioni')}>Funzioni</button>
              <button onClick={() => scrollTo('prezzi')}>Prezzi</button>
              <button onClick={() => scrollTo('demo')}>Richiedi demo</button>
            </span>
            <Link to="/login" style={{ fontWeight: 600, textDecoration: 'none' }}>Accedi</Link>
            <Link to="/login?mode=signup" className="lp-btn lp-btn-dark">Prova gratis</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-wrap">
        <div className="lp-hero">
          <div>
            <div className="lp-kicker">Menu digitale · Ordini · Cassa · Statistiche</div>
            <h1>Il menu che prende gli ordini da solo</h1>
            <p className="lp-sub" style={{ marginBottom: 28, maxWidth: 540 }}>
              Menu con QR code, ordini al tavolo, cassa, staff, inventario e statistiche in un'unica app.
              In tempo reale, da qualsiasi parte del mondo.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
              <Link to="/login?mode=signup" className="lp-btn lp-btn-dark">Prova gratis {PRICING.trialDays} giorni</Link>
              <button onClick={() => scrollTo('demo')} className="lp-btn lp-btn-light">Richiedi una demo</button>
            </div>
            <a href={`/#${DEMO_MENU_PATH}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 600 }}>
              Oppure apri il menu demo, come farebbe un tuo cliente →
            </a>
          </div>
          <div className="lp-hero-phone" style={{ display: 'flex', justifyContent: 'center' }}>
            <Phone src="/landing/hero-menu.jpg" alt="Menu digitale di esempio" width="min(300px, 70vw)" />
          </div>
        </div>
      </section>

      {/* CLIENTI */}
      <section className="lp-section gray">
        <div className="lp-wrap" style={{ textAlign: 'center' }}>
          <div className="lp-kicker">Per i tuoi clienti</div>
          <h2 className="lp-h2">Inquadrano il QR, sfogliano e ordinano</h2>
          <p className="lp-sub" style={{ maxWidth: 640, margin: '0 auto' }}>Tre stili tra cui scegliere: colori e layout si cambiano in un click, senza toccare i prodotti.</p>
          <div className="lp-themes">
            {[['/landing/tema-caffetteria.jpg', 'Caffetteria'], ['/landing/tema-pizzeria.jpg', 'Pizzeria'], ['/landing/tema-cocktail.jpg', 'Cocktail bar']].map(([src, cap]) => (
              <div key={cap}><Phone src={src} alt={`Stile ${cap}`} width={230} /><div className="lp-theme-cap">{cap}</div></div>
            ))}
          </div>
          <div className="lp-benefits" style={{ textAlign: 'left' }}>
            <div className="lp-benefit"><Check /><span><strong>Foto che vendono</strong>, con "Più venduti" e "Novità" in prima pagina: un menu curato alza lo scontrino medio.</span></div>
            <div className="lp-benefit"><Check /><span><strong>L'ordine lo scrive il cliente</strong>, con note e varianti: zero errori di comanda.</span></div>
            <div className="lp-benefit"><Check /><span><strong>Allergeni a norma di legge</strong>, indicati in automatico su ogni prodotto.</span></div>
          </div>
        </div>
      </section>

      {/* GESTIONALE */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div style={{ maxWidth: 720, marginBottom: 28 }}>
            <div className="lp-kicker">Per te</div>
            <h2 className="lp-h2">Le tue vendite, sotto controllo</h2>
            <p className="lp-sub">Fatturato, ordini e scontrino medio confrontati col periodo precedente, l'andamento giorno per giorno e le vendite per fascia oraria, giorno e mese.</p>
          </div>
          <Browser src="/landing/analytics-fatturato.jpg" alt="Statistiche del fatturato" url="mvpmenu — Analytics" />
          <div className="lp-an-row">
            <div className="lp-browser"><img src="/landing/analytics-prodotti.jpg" alt="Prodotti più venduti" loading="lazy" /></div>
            <div className="lp-world">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14 }}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginBottom: 10 }}>In tempo reale, ovunque nel mondo</div>
              <div style={{ color: '#d1d5db', fontSize: 15, lineHeight: 1.6 }}>Sei a casa o in vacanza? Apri l'app e vedi ordini, incassi e scorte aggiornati all'istante, da telefono, tablet o computer. Niente da installare nel locale: è tutto online.</div>
            </div>
          </div>
          <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 30, alignItems: 'center' }}>
            <div>
              <div className="lp-kicker">Cassa, staff e magazzino</div>
              <h3 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 14px', letterSpacing: '-.4px' }}>Tutto il locale in un'unica app</h3>
              <div className="lp-benefit" style={{ marginBottom: 12 }}><Check /><span><strong>Cassa al banco e ai tavoli</strong>, con i tuoi prodotti preferiti a portata di tocco.</span></div>
              <div className="lp-benefit" style={{ marginBottom: 12 }}><Check /><span><strong>Magazzino automatico:</strong> le scorte si scalano a ogni vendita, e i prodotti finiti diventano "Esaurito" nel menu.</span></div>
              <div className="lp-benefit"><Check /><span><strong>Staff con accessi e permessi dedicati:</strong> ogni ordine registra chi l'ha preso.</span></div>
            </div>
            <Browser src="/landing/cassa.jpg" alt="Cassa al banco" url="mvpmenu — Cassa" />
          </div>
        </div>
      </section>

      {/* 24 ORE */}
      <section className="lp-section gray">
        <div className="lp-wrap">
          <div className="lp-kicker">Si parte subito</div>
          <h2 className="lp-h2">Online in meno di 24 ore</h2>
          <div className="lp-steps">
            <div className="lp-step"><div className="lp-step-n">1</div><div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Ci mandi le foto del menu</div><div style={{ color: '#4b5563', lineHeight: 1.55 }}>Bastano quelle scattate col telefono, anche su WhatsApp.</div></div>
            <div className="lp-step"><div className="lp-step-n">2</div><div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Lo creiamo noi, completo</div><div style={{ color: '#4b5563', lineHeight: 1.55 }}>Categorie, prodotti, prezzi e foto già caricati. Tu scegli solo lo stile.</div></div>
            <div className="lp-step"><div className="lp-step-n">3</div><div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Sei online</div><div style={{ color: '#4b5563', lineHeight: 1.55 }}>Con i QR pronti da mettere sui tavoli. Nessun hardware da comprare.</div></div>
          </div>
        </div>
      </section>

      {/* FUNZIONI */}
      <section className="lp-section" id="funzioni">
        <div className="lp-wrap">
          <div className="lp-kicker">Tutto incluso</div>
          <h2 className="lp-h2">Tutte le funzioni di MVP Menu</h2>
          <div className="lp-features">
            {FEATURE_GROUPS.map(g => (
              <div key={g.title} className="lp-fgroup">
                <h4>{g.title}</h4>
                {g.items.map(it => <div key={it} className="lp-fi"><Box />{it}</div>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREZZI */}
      <section className="lp-section gray" id="prezzi">
        <div className="lp-wrap" style={{ textAlign: 'center' }}>
          <div className="lp-kicker">Prezzi semplici</div>
          <h2 className="lp-h2">Un solo piano, tutto incluso</h2>
          <div style={{ display: 'inline-block', border: '1.5px solid #000', borderRadius: 99, padding: '10px 20px', fontSize: 15, background: '#fff' }}>
            <strong>{PRICING.trialDays} giorni di prova gratuita</strong> <span style={{ color: '#6b7280' }}>— senza impegno: se non fa per te, non paghi nulla.</span>
          </div>
          <div className="lp-prices" style={{ textAlign: 'left' }}>
            <div className="lp-price dark">
              <div className="lp-ribbon">2 MESI OMAGGIO</div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Annuale</div>
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-1px' }}>{PRICING.yearly} € <span style={{ fontSize: 17, fontWeight: 600 }}>/ anno</span></div>
              <div style={{ color: '#d1d5db', marginTop: 6 }}><span style={{ textDecoration: 'line-through', opacity: .6 }}>{PRICING.yearlyFull} €</span> · paghi 10 mesi, ne ricevi 12</div>
            </div>
            <div className="lp-price">
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Flessibile</div>
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-1px' }}>{PRICING.monthly} € <span style={{ fontSize: 17, fontWeight: 600 }}>/ mese</span></div>
              <div style={{ color: '#6b7280', marginTop: 6 }}>Pagamento trimestrale o semestrale</div>
            </div>
          </div>
          <p style={{ maxWidth: 680, margin: '26px auto 0', color: '#4b5563', lineHeight: 1.6 }}>
            Tutte le funzioni incluse, aggiornamenti e assistenza. Pagamento con bonifico o in contanti, senza rinnovi automatici:
            ricevi un avviso nell'app 10 giorni prima della scadenza. <Link to="/termini" style={{ fontWeight: 600 }}>Condizioni di vendita</Link>
          </p>
          <div style={{ marginTop: 26 }}>
            <Link to="/login?mode=signup" className="lp-btn lp-btn-dark">Inizia la prova gratuita</Link>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="lp-section" id="demo">
        <div className="lp-wrap" style={{ maxWidth: 760 }}>
          <div className="lp-kicker">Richiedi una demo</div>
          <h2 className="lp-h2">Ti mostriamo MVP Menu sul tuo locale</h2>
          <p className="lp-sub" style={{ marginBottom: 28 }}>Lasciaci i tuoi contatti: ti richiamiamo per una demo gratuita e senza impegno.</p>

          {sent ? (
            <div style={{ border: '1px solid #c8e6c9', background: '#e8f5e9', borderRadius: 16, padding: 28, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Check size={44} bg="#1b5e20" /></div>
              <div style={{ fontSize: 21, fontWeight: 800, marginBottom: 6 }}>Grazie, richiesta inviata!</div>
              <div style={{ color: '#1b5e20', lineHeight: 1.6 }}>Ti contatteremo al più presto ai recapiti che ci hai lasciato.</div>
              <button onClick={() => setSent(false)} className="lp-btn lp-btn-light" style={{ marginTop: 18 }}>Invia un'altra richiesta</button>
            </div>
          ) : (
            <form className="lp-form" onSubmit={submitDemo} noValidate>
              <div><label htmlFor="d-name">Nome e cognome *</label><input id="d-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={120} autoComplete="name" /></div>
              <div><label htmlFor="d-biz">Nome del locale</label><input id="d-biz" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} maxLength={150} autoComplete="organization" /></div>
              <div><label htmlFor="d-email">Email *</label><input id="d-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} maxLength={200} autoComplete="email" /></div>
              <div><label htmlFor="d-phone">Telefono</label><input id="d-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={40} autoComplete="tel" /></div>
              <div className="full"><label htmlFor="d-city">Città</label><input id="d-city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} maxLength={120} autoComplete="address-level2" /></div>
              <div className="full"><label htmlFor="d-msg">Messaggio</label><textarea id="d-msg" rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} maxLength={3000} placeholder="Es. bar con 10 tavoli, vorremmo gli ordini al tavolo e la cassa" /></div>
              <div className="lp-hp" aria-hidden="true"><label htmlFor="d-web">Sito web</label><input id="d-web" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
              <label className="full" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, fontWeight: 400, color: '#374151', lineHeight: 1.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.privacy} onChange={e => setForm({ ...form, privacy: e.target.checked })} style={{ width: 18, height: 18, marginTop: 2, accentColor: '#000', flexShrink: 0 }} />
                <span>Ho letto l'<Link to="/privacy" target="_blank" style={{ fontWeight: 700 }}>Informativa privacy</Link> e acconsento a essere ricontattato per la demo. *</span>
              </label>
              {error && <div className="full" role="alert" style={{ padding: '12px 14px', borderRadius: 10, background: '#fdecec', border: '1px solid #f5c2c2', color: '#8a1c1c', fontSize: 14 }}>{error}</div>}
              <div className="full"><button type="submit" className="lp-btn lp-btn-dark" disabled={sending} style={{ opacity: sending ? .6 : 1 }}>{sending ? 'Invio in corso...' : 'Richiedi la demo gratuita'}</button></div>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-wrap" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon-192.png" alt="" width="26" height="26" style={{ borderRadius: 7 }} />
            <span>MVP Menu · <a href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a></span>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/termini">Condizioni</Link>
            <Link to="/login">Accedi</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
