/**
 * Registratore di GIF per la pagina "Aggiornamenti".
 *
 * Cattura dei frame con Playwright e li assembla in una GIF (puro JS, niente ffmpeg).
 * Le GIF vengono salvate in public/updates/<id>.gif e mostrate dal modale
 * "Guarda un esempio" (src .gif → l'<img> le anima da sola).
 *
 * PREREQUISITI (una volta): il dev server su http://localhost:5173 e i pacchetti
 *   npm install --no-save gifenc pngjs playwright-core
 *
 * USO:  node scripts/record-update-gifs.mjs
 *
 * PRATICA DA RIPETERE A OGNI AGGIORNAMENTO: aggiungi qui un "demo" per la nuova
 * funzione (una sequenza di azioni, catturando un frame nei momenti chiave) e
 * mappa l'id dell'aggiornamento alla sua .gif in src/pages/UpdatesPage.jsx.
 */
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const { GIFEncoder, quantize, applyPalette } = require('gifenc')
const { PNG } = require('pngjs')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5173'
const OUT = decodeURIComponent(new URL('../public/updates/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
const CRED = { email: 'test@prestige.local', password: 'Prestige2026!' }

// --- Helper GIF: un "recorder" con addFrame() che cattura lo stato corrente ---
function makeRecorder(page, { delay = 600 } = {}) {
  const enc = GIFEncoder()
  let w = 0, h = 0
  return {
    async frame(d = delay) {
      const buf = await page.screenshot()
      const png = PNG.sync.read(buf)
      w = png.width; h = png.height
      const palette = quantize(png.data, 256)
      const index = applyPalette(png.data, palette)
      enc.writeFrame(index, w, h, { palette, delay: d })
    },
    save(path) {
      enc.finish()
      fs.writeFileSync(path, Buffer.from(enc.bytes()))
      const kb = (fs.statSync(path).size / 1024).toFixed(0)
      console.log('  salvata', path.split(/[\\/]/).pop(), `(${kb} KB, ${w}x${h})`)
    }
  }
}

async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  await page.fill('input[type=email]', CRED.email)
  await page.fill('input[type=password]', CRED.password)
  await page.click('button[type=submit]'); await page.waitForTimeout(4000)
}

async function openEditor(page) {
  await page.goto(`${BASE}/#/impostazioni`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  await page.evaluate(() => { const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'themes')); if (s) { s.value = 'themes'; s.dispatchEvent(new Event('change', { bubbles: true })) } })
  await page.waitForTimeout(1500)
  for (const s of await page.$$('select')) {
    const isL = await s.evaluate(e => [...e.options].some(o => /builder/i.test(o.value)))
    if (isL) { const v = await s.evaluate(e => [...e.options].find(o => /builder/i.test(o.value)).value); await s.selectOption(v); break }
  }
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Apri Editor Home/i }).first().click()
  await page.waitForTimeout(3500)
}

const clickText = (page, re, maxLen = 40) => page.evaluate(({ src, maxLen }) => {
  const re = new RegExp(src, 'i')
  const el = [...document.querySelectorAll('button')].find(b => re.test(b.textContent || '') && b.textContent.length < maxLen)
  if (el) { el.click(); return true } return false
}, { src: re.source, maxLen })

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })

  // ===== GIF 1: Editor live — i controlli cambiano il menu all'istante =====
  {
    console.log('GIF live-editor…')
    const page = await browser.newPage({ viewport: { width: 380, height: 780 } })
    const rec = makeRecorder(page, { delay: 750 })
    await login(page); await openEditor(page)
    await rec.frame()                                   // editor aperto (Contenuto)
    await clickText(page, /^Aspetto$/); await page.waitForTimeout(700); await rec.frame()
    // cambia colore accento
    await page.evaluate(() => { const ci = document.querySelectorAll('input[type=color]')[3]; if (ci) { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(ci, '#e4572e'); ci.dispatchEvent(new Event('input', { bubbles: true })); ci.dispatchEvent(new Event('change', { bubbles: true })) } })
    await page.waitForTimeout(600); await rec.frame()
    // cambia sfondo pagina
    await page.evaluate(() => { const ci = document.querySelectorAll('input[type=color]')[0]; if (ci) { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(ci, '#0f172a'); ci.dispatchEvent(new Event('input', { bubbles: true })); ci.dispatchEvent(new Event('change', { bubbles: true })) } })
    await page.waitForTimeout(600); await rec.frame()
    // testo chiaro per leggibilità su sfondo scuro
    await page.evaluate(() => { const ci = document.querySelectorAll('input[type=color]')[2]; if (ci) { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(ci, '#f8fafc'); ci.dispatchEvent(new Event('input', { bubbles: true })); ci.dispatchEvent(new Event('change', { bubbles: true })) } })
    await page.waitForTimeout(600); await rec.frame()
    // forma squadrata
    await clickText(page, /^Squadrato$/, 20); await page.waitForTimeout(700); await rec.frame(1200)
    rec.save(OUT + 'live-editor.gif')
    await page.close()
  }

  // ===== GIF 2: Menu — header e badge restano fissi mentre scorri =====
  {
    console.log('GIF temi-layout…')
    const page = await browser.newPage({ viewport: { width: 380, height: 740 } })
    const rec = makeRecorder(page, { delay: 650 })
    await page.goto(`${BASE}/#/menu/prestige-test`, { waitUntil: 'networkidle' }); await page.waitForTimeout(4500)
    await rec.frame()
    for (const y of [300, 300, 400, 400]) { await page.evaluate(dy => window.scrollBy(0, dy), y); await page.waitForTimeout(500); await rec.frame() }
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500); await rec.frame(1000)
    rec.save(OUT + 'temi-layout.gif')
    await page.close()
  }

  // ===== GIF 3: Riordino manuale (trascina) nel carosello =====
  {
    console.log('GIF riordino…')
    const page = await browser.newPage({ viewport: { width: 380, height: 780 } })
    const rec = makeRecorder(page, { delay: 500 })
    await login(page); await openEditor(page)
    // apri la sezione manuale "I nostri consigli"
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === 'Modifica').find(x => /Prodotti scelti/.test(x.parentElement?.textContent || '')); b?.click() })
    await page.waitForTimeout(1000)
    await page.evaluate(() => { const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'manual' && /Manuale/i.test(o.textContent))); if (sel) { sel.value = 'manual'; sel.dispatchEvent(new Event('change', { bubbles: true })) } })
    await page.waitForTimeout(500)
    await clickText(page, /Ordina manualmente/); await page.waitForTimeout(1000); await rec.frame(900)
    // trascina l'ultima riga verso l'alto
    const handles = await page.$$('[title="Trascina"]')
    const modalHandles = handles.slice(-4) // le ultime appartengono al modale
    if (modalHandles.length >= 2) {
      const from = await modalHandles[modalHandles.length - 1].boundingBox()
      const to = await modalHandles[0].boundingBox()
      await page.mouse.move(from.x + 6, from.y + 6); await page.mouse.down()
      const steps = 5
      for (let i = 1; i <= steps; i++) {
        const y = from.y + (to.y - from.y) * (i / steps)
        await page.mouse.move(to.x + 6, y, { steps: 3 }); await page.waitForTimeout(120); await rec.frame(220)
      }
      await page.mouse.up(); await page.waitForTimeout(300); await rec.frame(1200)
    }
    rec.save(OUT + 'riordino.gif')
    await page.close()
  }

  await browser.close()
  console.log('FATTO')
}

main().catch(e => { console.error(e); process.exit(1) })
