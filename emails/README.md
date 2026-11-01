# Email inviate (MVP Menu)

Cartella con le email che inviamo ai contatti registrati, via **Resend**.
Un file HTML per ogni email. Ogni template è autoconsistente (stili inline,
pronto per i client di posta).

## Email

### `aggiornamenti-2026-11-01.html` — Annuncio aggiornamenti
- **Oggetto:** `Abbiamo aggiornato MVP Menu ✨`
- **Preview (preheader):** `Menu più chiari, Cassa più veloce e una nuova pagina Aggiornamenti. Scopri tutte le novità →`
- **Mittente:** `MVP Menu <novita@DOMINIO_DA_VERIFICARE>`  ← sostituire `DOMINIO_DA_VERIFICARE` con il dominio verificato su Resend
- **CTA:** porta a `https://mvpmenu20.vercel.app/#/aggiornamenti` (il titolare entra nel pannello e vede le novità)

## Come inviare con Resend

1. Verifica il dominio su Resend (Settings → Domains) così il mittente `novita@...` è autorizzato.
2. Crea una **API key** (Resend → API Keys).
3. Invia (esempio singolo con cURL):

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "MVP Menu <novita@DOMINIO_DA_VERIFICARE>",
    "to": ["destinatario@esempio.it"],
    "subject": "Abbiamo aggiornato MVP Menu ✨",
    "html": "<CONTENUTO DI aggiornamenti-2026-11-01.html>"
  }'
```

> Per l'invio a tutti i contatti registrati useremo uno script che prende gli
> indirizzi dal database e invia in batch (Resend consente fino a 100
> destinatari per richiesta con l'endpoint batch). Da definire insieme:
> sorgente contatti, consenso/privacy e link di disiscrizione (`{{unsubscribe_url}}`).

## Note
- `{{unsubscribe_url}}` nel footer va popolato al momento dell'invio (link di disiscrizione).
- Le immagini, se aggiunte, vanno ospitate su URL pubblici (i client email non caricano file locali).
