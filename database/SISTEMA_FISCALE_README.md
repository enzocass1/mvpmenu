# SISTEMA FISCALE - Documentazione Completa

## Panoramica
Sistema completo per la gestione fiscale di ristoranti con integrazione Registratore Telematico (RT).

## Componenti Implementati

### 1. Database Schema (`fiscal_system_schema.sql`)

**9 Tabelle Create:**

#### `rt_configurations` - Configurazione RT per ristorante
- Dati aziendali (ragione sociale, P.IVA, indirizzo)
- Configurazione hardware RT (modello, connessione)
- Middleware settings (URL, API key)
- Markup per servizio al tavolo
- Impostazioni lotteria e stampa automatica

#### `rt_models_catalog` - Catalogo modelli RT supportati
Pre-caricati **11 modelli** da **5 produttori**:
- **Epson**: FP-81 II RT, FP-90 III RT
- **Custom**: KUBE II RT, Q3X RT
- **RCH**: Retail 1000 RT, Fiscal Neo RT, Fiscal Compact RT
- **Ditron**: IP-103 RT
- **Olivetti**: Nettuna 8000 RT, Form 200 RT, PRT 300M RT

#### `tax_rates` - Aliquote IVA
- Nome (es. "IVA 22%", "IVA 10%")
- Percentuale aliquota
- Codice reparto RT
- Link a restaurant_id

#### `payment_methods` - Metodi di pagamento
- Nome metodo (Contanti, Carta, ecc)
- Codice pagamento RT
- Flag is_cash
- Icona e ordinamento

#### `fiscal_receipts` - Scontrini fiscali
- Tipo: sale, refund, void, preconto
- Numero progressivo e data
- Importi (subtotal, tax, total, paid, change)
- Link a ordine, tavolo, cameriere
- Z closure reference

#### `fiscal_receipt_items` - Righe scontrino
- Prodotto e quantità
- Prezzi e aliquota IVA applicata
- Link a receipt

#### `fiscal_receipt_payments` - Pagamenti per scontrino
- Supporto multi-pagamento (es. 50€ cash + 30€ carta)
- Amount per metodo
- Link a receipt

#### `fiscal_closures` - Chiusure fiscali
- Tipo: X (lettura) o Z (chiusura)
- Progressivi (receipt_count, z_number)
- Totali (total_sales, total_tax, total_cash, total_card)
- Operator e timestamp

#### `rt_communication_logs` - Log comunicazioni RT
- Tipo comando (print_receipt, fiscal_closure_x, fiscal_closure_z, status_check)
- Request e response
- Status code
- Tracciamento errori

### 2. Frontend - FiscalSettings.jsx

**Interfaccia a 5 Tab:**

#### Tab 1: Dati Aziendali
- Ragione sociale
- Partita IVA
- Codice fiscale
- Indirizzo completo (via, città, CAP, provincia)

#### Tab 2: Configurazione RT
- **Selezione Modello**: Dropdown con 11 modelli RT pre-caricati
- **Numero Seriale RT**: Input per numero matricola
- **Tipo Connessione**: USB / Ethernet / Seriale / Bluetooth
- **Parametri Connessione**:
  - Ethernet: IP + Porta
  - Seriale: Porta COM
  - USB: Auto-detect
- **Middleware**:
  - URL server locale (default: http://localhost:3001)
  - API Key per autenticazione
- **Test Connessione**: Bottone per verificare comunicazione RT
- **Markup Tavolo**: Percentuale ricarico servizio al tavolo vs banco

#### Tab 3: Aliquote IVA
- Tabella aliquote esistenti
- CRUD: Add, Edit, Delete
- Campi: Nome, Percentuale, Codice Reparto RT
- Pre-impostate: 22%, 10%, 4%, Esente

#### Tab 4: Metodi di Pagamento
- Tabella metodi esistenti
- CRUD: Add, Edit, Delete
- Campi: Nome, Codice RT, Is Cash, Icona, Ordinamento
- Esempi: Contanti, Carta, Satispay, Ticket

#### Tab 5: Chiusure Fiscali
- **Visualizzazione Progressivi**:
  - Ultimo numero Z
  - Totale scontrini del giorno
  - Totale vendite del giorno
- **Azioni**:
  - Chiusura X (lettura intermedia)
  - Chiusura Z (chiusura giornaliera)
- **Storico**: Ultimi 30 giorni di chiusure

### 3. Routing e Navigazione

**File modificati:**

#### `src/App.jsx`
```javascript
import FiscalSettings from './pages/FiscalSettings'

<Route
  path="/fiscal-settings"
  element={session ? <FiscalSettings /> : <Navigate to="/login" replace />}
/>
```

#### `src/pages/Dashboard.jsx`
```javascript
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

<button onClick={() => navigate('/fiscal-settings', { state: { restaurant } })}>
  Apri Impostazioni Fiscali
</button>
```

## Architettura Sistema

```
┌─────────────────┐
│  React Frontend │
│  (FiscalSettings)│
└────────┬────────┘
         │
         │ Supabase Client
         │
┌────────▼────────┐
│   Supabase      │
│  PostgreSQL DB  │
│  + PostgREST API│
└────────┬────────┘
         │
         │ (per operazioni fiscali)
         │
┌────────▼────────┐
│  RT Middleware  │
│  (Node.js)      │
│  localhost:3001 │
└────────┬────────┘
         │
         │ USB/Ethernet/Serial
         │
┌────────▼────────┐
│  Registratore   │
│  Telematico RT  │
│  (Hardware)     │
└─────────────────┘
```

## Sicurezza e Permessi

### Row Level Security (RLS)
Tutte le tabelle hanno policies per:
- **Lettura**: Solo dati del proprio ristorante
- **Inserimento**: Solo per il proprio ristorante
- **Aggiornamento**: Solo propri record
- **Cancellazione**: Solo propri record

Policy esempio:
```sql
CREATE POLICY "Users can view their restaurant's RT config"
ON rt_configurations FOR SELECT
USING (restaurant_id IN (
  SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
));
```

### Grants
Tutti i grant necessari per `authenticated` e `anon` roles:
```sql
GRANT ALL ON TABLE rt_configurations TO authenticated;
GRANT SELECT ON TABLE rt_configurations TO anon;
```

## Workflow Operativo

### Setup Iniziale
1. ✅ Eseguire `fiscal_system_schema.sql` su Supabase
2. ✅ Aprire Impostazioni Fiscali dalla Dashboard
3. ✅ Compilare dati aziendali
4. ✅ Selezionare modello RT e configurare connessione
5. ✅ Configurare aliquote IVA
6. ✅ Configurare metodi di pagamento

### Uso Giornaliero (DA IMPLEMENTARE)
1. Apertura: Cameriere fa login
2. Ordini: Cliente ordina al tavolo → ordine in pending
3. Cassa: Operatore genera scontrino fiscale da ordine
4. RT: Middleware invia comando al RT → stampa scontrino
5. Database: Record salvato in fiscal_receipts
6. Fine giornata: Chiusura Z → azzera contatori

## Funzionalità Future (NON IMPLEMENTATE)

### RT Middleware (Server Node.js locale)
**Endpoints da implementare:**
```javascript
GET  /api/status              // Stato RT
POST /api/receipt             // Stampa scontrino
POST /api/closure/x           // Chiusura X
POST /api/closure/z           // Chiusura Z
POST /api/cancel              // Annullo scontrino
GET  /api/progressives        // Leggi progressivi
```

**Librerie consigliate:**
- `escpos` per stampanti Epson
- `serialport` per comunicazione seriale
- `express` per server REST
- `socket.io` per notifiche real-time

### Interfaccia Cassa (POS)
- Selezione prodotti da menu
- Calcolo totale con IVA
- Selezione metodo pagamento
- Gestione resto
- Stampa scontrino fiscale

### Gestione Tavoli
- Layout grafico sale
- Stati tavolo (libero/occupato/sporco)
- Assegnazione ordini a tavoli
- Trasformazione ordine → scontrino

### Preconti
- Generazione documento non fiscale
- Stampa su stampante non fiscale
- Trasformazione in scontrino fiscale

## File del Sistema

```
mvpmenu/
├── database/
│   ├── fiscal_system_schema.sql          # Schema completo DB
│   ├── fix_406_error.sql                 # Fix errore 406
│   └── TROUBLESHOOTING_406.md            # Guida troubleshooting
│
├── src/
│   ├── pages/
│   │   ├── FiscalSettings.jsx            # Pagina impostazioni
│   │   └── Dashboard.jsx                 # Dashboard (con link)
│   └── App.jsx                           # Routing
│
└── (middleware - DA CREARE)
    ├── server.js                         # Server Express
    ├── rt-controllers/
    │   ├── epson.js                      # Controller Epson
    │   ├── custom.js                     # Controller Custom
    │   └── ...                           # Altri produttori
    └── package.json
```

## Normativa Fiscale Italiana

### Scontrino Fiscale
Deve contenere:
- ✅ Dati identificativi esercente (P.IVA, indirizzo)
- ✅ Numero progressivo giornaliero
- ✅ Data e ora
- ✅ Dettaglio prodotti/servizi
- ✅ Aliquote IVA applicate
- ✅ Totale complessivo
- ✅ Metodo di pagamento
- ✅ Numero matricola RT

### Chiusure Fiscali
- **Chiusura X**: Può essere fatta più volte, non azzera
- **Chiusura Z**: Una sola al giorno, azzera contatori
- Obbligo conservazione per 5 anni

### Lotteria degli Scontrini
Se abilitata:
- Richiesta codice lotteria cliente
- Stampa codice su scontrino
- Invio telematico dati Agenzia Entrate

## Note Tecniche

### Gestione Errori
Il sistema è resiliente a errori API (406, ecc):
- Page non crasha se API fallisce
- Log dettagliati in console
- Graceful degradation (continua con dati vuoti)

### Performance
- Caricamento parallelo di config, tax rates, payments, models
- Debouncing su input fields
- Ottimizzazione query con indici DB

### Multi-Restaurant
Ogni configurazione è legata a `restaurant_id`:
- Supporto multi-tenant nativo
- Isolamento dati tramite RLS
- Ogni ristorante ha propria configurazione RT

## Prossimi Passi

### Priorità Alta
1. ⚠️ Risolvere errore 406 (vedi TROUBLESHOOTING_406.md)
2. 🔧 Implementare RT Middleware locale
3. 💳 Creare interfaccia Cassa/POS

### Priorità Media
4. 🪑 Gestione Sale e Tavoli
5. 📄 Interfaccia Preconti
6. 📊 Report fiscali (registro corrispettivi)

### Priorità Bassa
7. 🎟️ Integrazione Lotteria Scontrini
8. 📱 App mobile per camerieri
9. 🔔 Notifiche real-time stato RT

## Supporto

Per problemi o domande:
- Consulta TROUBLESHOOTING_406.md per errori API
- Verifica log console browser (F12)
- Controlla log Supabase SQL Editor
- Testa API direttamente con Postman/cURL
