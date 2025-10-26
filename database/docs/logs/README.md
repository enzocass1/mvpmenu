# 📚 Sistema di Logging - MVPMenu

Documentazione completa del sistema di logging per continuità tra sessioni e tracking delle modifiche.

---

## 🎯 Scopo

Questo sistema di logging permette di:
- ✅ Mantenere continuità tra sessioni (anche se token finiscono o sessione si chiude)
- ✅ Tracciare cronologicamente tutti i prompt utente
- ✅ Registrare tutte le modifiche tecniche al codice
- ✅ Monitorare task completate/in corso/pianificate
- ✅ Riprendere esattamente da dove si era rimasti
- ✅ Notificare automaticamente su Slack ogni modifica

---

## 📁 Struttura File

```
/database/docs/logs/
├── CONVERSATION_LOG.md       # Cronologia prompt utente
├── DEVELOPMENT_LOG.md         # Modifiche tecniche al codice
├── TASKS_LOG.md               # Task completate/in corso/pianificate
├── CURRENT_CONTEXT.md         # 🔴 CRITICO: Contesto corrente per AI
└── README.md                  # Questo file (documentazione)
```

---

## 📄 Descrizione File

### 1. CONVERSATION_LOG.md
**Scopo:** Cronologia completa di tutti i prompt utente e relative azioni

**Formato Entry:**
```markdown
## [2025-10-26T15:45:00+01:00] - Titolo Breve

### 📝 Prompt Utente
[Prompt originale completo dell'utente]

### ⚙️ Azioni Eseguite
- ✅ Azione completata 1
- ✅ Azione completata 2
- 🚧 Azione in corso

### 📊 Stato
**Status:** ✅ Completato / 🚧 In Corso / ❌ Fallito
```

**Quando si aggiorna:**
- All'inizio (log prompt)
- Alla fine (summary azioni)

---

### 2. DEVELOPMENT_LOG.md
**Scopo:** Registro tecnico dettagliato delle modifiche al codice

**Formato Entry:**
```markdown
## [2025-10-26T15:45:00+01:00] - Titolo Modifica

### 🎯 Obiettivo
[Descrizione obiettivo tecnico]

### 📝 Modifiche Effettuate

#### File Creati
- ✅ `/path/to/file.js` - Descrizione

#### File Modificati
- ✅ `/path/to/file.js` (linee 10-50) - Cosa è cambiato

### 🔧 Dettagli Tecnici
[Dettagli implementazione, decisioni architetturali, pattern usati]

### 📊 Metriche
- **File Creati:** X
- **File Modificati:** Y
- **Complessità:** Bassa/Media/Alta

### 💡 Note
[Note importanti, warning, TODO]

### 🔗 Link Rilevanti
[Link ai file modificati o documentazione]
```

**Quando si aggiorna:** Dopo ogni modifica tecnica

---

### 3. TASKS_LOG.md
**Scopo:** Tracking di task completate, in corso e pianificate

**Formato Entry:**
```markdown
## [2025-10-26T15:45:00+01:00] - Contesto Task

### ✅ Task Completate
- [x] Task 1
- [x] Task 2

### 🚧 Task In Corso
- [ ] Task in corso 1

### 📋 Task Pianificate
- [ ] Task pianificata 1
- [ ] Task pianificata 2

### 📊 Progress
- **Completate:** X/Y (Z%)
```

**Quando si aggiorna:** Dopo ogni cambio stato task

---

### 4. CURRENT_CONTEXT.md 🔴 CRITICO
**Scopo:** File essenziale per riprendere sessioni - il "punto di ripresa" dell'AI

**Sezioni Principali:**
- **COSA STIAMO FACENDO ORA** → Focus corrente
- **DOVE SIAMO** → Stato attuale, ultima azione, prossimi step
- **ULTIMI 3 CAMBIAMENTI** → Cronologia recente
- **TASK PENDENTI** → Cosa manca da fare
- **NOTE IMPORTANTI** → Info critiche
- **FILE RILEVANTI** → Link ai file chiave
- **PROMPT PER AI** → Auto-istruzioni per riprendere sessione

**Quando si aggiorna:**
- ⚠️ **SEMPRE** alla fine di ogni ciclo (OBBLIGATORIO)
- È l'ultimo file aggiornato prima di concludere

**Come l'AI lo usa:**
1. All'inizio di nuova sessione → Legge questo file PRIMA di tutto
2. Identifica contesto da sezioni
3. Risponde all'utente con riassunto
4. Chiede conferma o nuove direzioni

---

### 5. README.md
**Scopo:** Documentazione completa del sistema (questo file)

**Contenuto:**
- Descrizione sistema
- Struttura file
- Workflow completo
- Istruzioni uso
- FAQ

---

## 🔄 Workflow Completo (Il Loop)

Ogni volta che l'utente fa una richiesta:

```
1. 📝 LOG PROMPT
   ↓
   Scrivo in CONVERSATION_LOG.md il prompt con timestamp

2. ⚙️ ESEGUI RICHIESTA
   ↓
   Faccio il lavoro richiesto (creo/modifico file, etc.)

3. 🔧 UPDATE DEVELOPMENT_LOG
   ↓
   Aggiorno DEVELOPMENT_LOG.md con dettagli tecnici

4. ✅ UPDATE TASKS_LOG
   ↓
   Aggiorno TASKS_LOG.md con task completate/in corso

5. 📊 UPDATE CONVERSATION_LOG
   ↓
   Aggiungo summary azioni in CONVERSATION_LOG.md

6. 🎯 UPDATE CURRENT_CONTEXT (CRITICO)
   ↓
   Aggiorno CURRENT_CONTEXT.md con nuovo stato
   (QUESTO È IL FILE PIÙ IMPORTANTE - SEMPRE AGGIORNATO)

7. 💾 GIT COMMIT
   ↓
   Faccio commit locale di tutti i log + modifiche

8. 💬 SLACK NOTIFICATION
   ↓
   Invio notifica con riepilogo ultimo log
```

---

## 🚀 Come Riprendere una Sessione

### Per l'Utente:

**Scenario 1: Nuova Sessione**
```
Utente: "Analizza il progetto"
```

L'AI:
1. Legge `CURRENT_CONTEXT.md`
2. Identifica dove eravamo rimasti
3. Risponde con riassunto:
   - Cosa stavamo facendo
   - Ultimo completato
   - Prossimi step

**Scenario 2: Continuare da Log Specifico**
```
Utente: "Continua dall'ultimo log del 2025-10-26 15:45"
```

L'AI:
1. Legge `CONVERSATION_LOG.md` → trova entry con timestamp
2. Legge `CURRENT_CONTEXT.md` → stato attuale
3. Continua da lì

### Per l'AI:

**All'inizio di ogni nuova sessione:**
1. ✅ Leggi `CURRENT_CONTEXT.md` PRIMA di rispondere
2. ✅ Identifica contesto da sezioni
3. ✅ Rispondi con riassunto stato
4. ✅ Chiedi conferma o nuove direzioni

**Alla fine di ogni ciclo:**
1. ✅ Aggiorna tutti i log
2. ✅ Aggiorna `CURRENT_CONTEXT.md` (OBBLIGATORIO)
3. ✅ Git commit
4. ✅ Slack notification

---

## 💬 Notifiche Slack

**Webhook URL:** `https://hooks.slack.com/services/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`

**Formato Messaggio:**
```json
{
  "text": "🔔 MVPMenu - Aggiornamento Progetto",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*[Timestamp]* - Titolo Modifica\n\n*Azioni:*\n✅ Azione 1\n✅ Azione 2\n\n*File modificati:* X\n*Task completate:* Y"
      }
    }
  ]
}
```

**Quando si invia:** Alla fine di ogni ciclo (step 8)

---

## 📊 Formato Timestamp

**Standard Usato:** ISO 8601
**Formato:** `2025-10-26T15:45:00+01:00`

**Componenti:**
- `2025-10-26` → Data (YYYY-MM-DD)
- `T` → Separatore
- `15:45:00` → Ora (HH:MM:SS)
- `+01:00` → Timezone offset

**Esempio in JavaScript:**
```javascript
new Date().toISOString()
// Output: "2025-10-26T14:45:00.000Z"
```

---

## 🏷️ Tag e Categorie

Usati in `DEVELOPMENT_LOG.md` per categorizzare modifiche:

- `[FEATURE]` - Nuova funzionalità
- `[BUGFIX]` - Correzione bug
- `[REFACTOR]` - Refactoring codice
- `[DOCS]` - Documentazione
- `[STYLE]` - Modifiche stile/design
- `[TEST]` - Test
- `[CHORE]` - Manutenzione
- `[PERF]` - Performance

**Esempio:**
```markdown
## [2025-10-26T15:45:00+01:00] - [FEATURE] Sistema Logging
```

---

## 💾 Git Workflow

**Policy Corrente:**
- ✅ Commit locale automatico alla fine di ogni ciclo
- ❌ NO push automatico su remote
- ✅ Push manuale su richiesta utente

**Messaggio Commit:**
```
[LOG] Descrizione breve - Timestamp

- File modificati: X
- Task completate: Y
- Riferimento: [link a log entry]
```

---

## ❓ FAQ

### Q: Cosa succede se dimentico di aggiornare un log?
**A:** Il sistema è progettato per aggiornare SEMPRE tutti i log in sequenza. Se un passaggio viene saltato, il `CURRENT_CONTEXT.md` potrebbe non riflettere lo stato reale.

### Q: Posso eliminare vecchie entry nei log?
**A:** No, i log sono storici. Ogni entry va conservata per tracciabilità completa.

### Q: Come cerco un log specifico?
**A:** Usa Ctrl+F con timestamp o parole chiave nel file. Ogni entry ha timestamp ISO 8601.

### Q: CURRENT_CONTEXT.md è troppo lungo?
**A:** No problem. Mantieni solo:
- Ultimi 3 cambiamenti
- Task pendenti correnti
- Sezione "PROMPT PER AI" invariata

### Q: Posso modificare manualmente i log?
**A:** Sì, ma solo per correzioni. Aggiungi nota `[EDIT manuale - motivo]`

### Q: Slack notification fallisce?
**A:** Verifica webhook URL valido. Il sistema procede comunque (notification non blocca workflow).

---

## 🔗 Link Utili

- [CONVERSATION_LOG.md](./CONVERSATION_LOG.md) - Cronologia prompt
- [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) - Log tecnico
- [TASKS_LOG.md](./TASKS_LOG.md) - Task tracking
- [CURRENT_CONTEXT.md](./CURRENT_CONTEXT.md) - Contesto corrente (CRITICO)
- [Documentazione MVPMenu](../DATABASE_SCHEMA_COMPLETO.md) - Schema DB principale

---

## 📝 Note Finali

**Principi Chiave:**
1. ⚠️ `CURRENT_CONTEXT.md` è il file PIÙ IMPORTANTE - aggiornalo SEMPRE
2. 📊 Ogni log entry deve avere timestamp ISO 8601
3. ✅ Mantieni i log concisi ma completi
4. 🔗 Usa link relativi per riferimenti tra file
5. 💬 Slack notification ogni singola modifica

**Questo sistema garantisce:**
- Zero perdita di contesto tra sessioni
- Tracciabilità completa di ogni modifica
- Ripresa immediata da qualsiasi punto
- Notifiche real-time su Slack

---

**Creato:** 2025-10-26T15:45:00+01:00
**Ultima Modifica:** 2025-10-26T15:45:00+01:00
**Versione:** 1.0.0

