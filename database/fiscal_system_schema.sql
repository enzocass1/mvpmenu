-- ============================================
-- SCHEMA DATABASE SISTEMA FISCALE
-- Sistema POS con integrazione RT (Registratore Telematico)
-- ============================================

-- 1. CONFIGURAZIONE RT PER RISTORANTE
-- ============================================
CREATE TABLE IF NOT EXISTS rt_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) UNIQUE NOT NULL,

  -- DATI AZIENDALI (obbligatori per scontrino fiscale)
  business_name TEXT NOT NULL,
  vat_number TEXT NOT NULL, -- Partita IVA (formato: IT12345678901)
  tax_code TEXT, -- Codice Fiscale (opzionale se diverso da P.IVA)
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  province TEXT NOT NULL CHECK (length(province) = 2),

  -- DATI REGISTRATORE TELEMATICO
  rt_serial_number TEXT, -- Matricola RT
  rt_model TEXT, -- Modello (es: "Epson FP-81 II", "Custom Kube II", "RCH Prisma")
  rt_manufacturer TEXT, -- Produttore (epson, custom, rch, ditron, ecc.)
  rt_connection_type TEXT CHECK (rt_connection_type IN ('usb', 'ethernet', 'serial', 'bluetooth')),
  rt_ip_address TEXT, -- Se ethernet
  rt_port INTEGER, -- Porta (default 9100 per ethernet)
  rt_com_port TEXT, -- Porta COM se seriale (es: COM3, /dev/ttyUSB0)

  -- MIDDLEWARE CONFIGURATION
  middleware_url TEXT, -- URL del server middleware locale (es: http://192.168.1.50:3001)
  middleware_api_key TEXT, -- Chiave API per autenticazione

  -- STATO RT
  rt_status TEXT DEFAULT 'not_configured' CHECK (rt_status IN ('not_configured', 'connected', 'disconnected', 'error')),
  rt_status_message TEXT,
  last_connection_check TIMESTAMP WITH TIME ZONE,

  -- PROGRESSIVI FISCALI (gestiti automaticamente)
  last_receipt_number INTEGER DEFAULT 0,
  last_daily_progressive INTEGER DEFAULT 0, -- Progressivo giornaliero
  last_closure_number INTEGER DEFAULT 0, -- Numero chiusure Z
  last_closure_date DATE,
  fiscal_memory_used_percent DECIMAL(5,2), -- % memoria fiscale usata

  -- CONFIGURAZIONE GENERALE
  lottery_enabled BOOLEAN DEFAULT true, -- Lotteria degli scontrini
  auto_print_receipt BOOLEAN DEFAULT true, -- Stampa automatica scontrino
  require_operator_code BOOLEAN DEFAULT false, -- Richiedi codice operatore
  enable_receipt_copy BOOLEAN DEFAULT true, -- Abilita copia scontrino (non fiscale)

  -- CONFIGURAZIONE SERVIZIO
  table_service_markup_percent DECIMAL(5,2) DEFAULT 0, -- Maggiorazione servizio al tavolo (es: 10.00 per +10%)

  -- TIMESTAMP
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ALIQUOTE IVA
-- ============================================
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL, -- "IVA 22%", "IVA 10%", "IVA 4%", "Esente"
  rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100), -- 22.00, 10.00, 4.00, 0.00
  rt_department_code TEXT, -- Codice reparto su RT (es: "1", "2", "3", "4")

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(restaurant_id, name)
);

-- 3. METODI DI PAGAMENTO
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL, -- "Contanti", "Carta di Credito", "Satispay", "Buoni Pasto"
  icon TEXT, -- Nome icona per UI (es: "cash", "credit_card", "mobile")
  rt_payment_code TEXT, -- Codice pagamento su RT (es: "0" contanti, "1" carta, ecc.)

  requires_amount BOOLEAN DEFAULT true, -- Se false, prende importo residuo automaticamente
  is_cash BOOLEAN DEFAULT false, -- Se true, calcola resto
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(restaurant_id, name)
);

-- 4. SCONTRINI FISCALI
-- ============================================
CREATE TABLE IF NOT EXISTS fiscal_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id), -- Collegato all'ordine (se da tavolo)

  -- NUMERAZIONE FISCALE
  receipt_number INTEGER NOT NULL, -- Numero scontrino (progressivo giornaliero)
  fiscal_code TEXT, -- Codice univoco generato da RT
  z_number INTEGER, -- Numero chiusura Z di riferimento

  -- TIPO SCONTRINO
  receipt_type TEXT NOT NULL DEFAULT 'sale' CHECK (receipt_type IN ('sale', 'refund', 'void', 'preconto')),
  -- sale: vendita normale
  -- refund: reso
  -- void: annullo
  -- preconto: non fiscale, solo anteprima

  -- SERVIZIO
  service_type TEXT CHECK (service_type IN ('table', 'counter', 'takeaway', 'delivery')),
  table_number INTEGER,

  -- IMPORTI
  subtotal DECIMAL(10,2) NOT NULL, -- Imponibile totale
  service_charge DECIMAL(10,2) DEFAULT 0, -- Supplemento servizio
  tax_amount DECIMAL(10,2) NOT NULL, -- IVA totale
  total_amount DECIMAL(10,2) NOT NULL, -- Totale lordo

  -- BREAKDOWN IVA (JSON per dettagli)
  tax_breakdown JSONB, -- { "22": { net: 100, tax: 22, gross: 122 }, "10": {...} }

  -- CLIENTE (opzionale per lotteria)
  customer_name TEXT,
  customer_tax_code TEXT, -- Codice fiscale cliente (per lotteria)
  customer_lottery_code TEXT, -- Codice lotteria scontrini

  -- OPERATORE
  operator_id UUID REFERENCES restaurant_staff(id),
  operator_name TEXT,

  -- STATO
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'printed', 'transmitted', 'voided', 'error')),
  -- draft: in preparazione
  -- printed: stampato su RT
  -- transmitted: inviato ad AdE (automatico da RT)
  -- voided: annullato
  -- error: errore durante stampa

  error_message TEXT,

  -- TIMESTAMP
  printed_at TIMESTAMP WITH TIME ZONE,
  transmitted_at TIMESTAMP WITH TIME ZONE,
  voided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PRODOTTI IN SCONTRINO FISCALE
-- ============================================
CREATE TABLE IF NOT EXISTS fiscal_receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID REFERENCES fiscal_receipts(id) ON DELETE CASCADE NOT NULL,

  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_description TEXT,

  quantity DECIMAL(10,3) NOT NULL, -- Supporta decimali per kg, litri, ecc.
  unit_price DECIMAL(10,2) NOT NULL,

  tax_rate_id UUID REFERENCES tax_rates(id),
  tax_rate DECIMAL(5,2) NOT NULL, -- IVA %

  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,

  subtotal DECIMAL(10,2) NOT NULL, -- Imponibile riga
  tax_amount DECIMAL(10,2) NOT NULL, -- IVA riga
  total DECIMAL(10,2) NOT NULL, -- Totale riga

  notes TEXT, -- Note prodotto (es: "senza cipolla")

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PAGAMENTI SCONTRINO
-- ============================================
CREATE TABLE IF NOT EXISTS fiscal_receipt_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID REFERENCES fiscal_receipts(id) ON DELETE CASCADE NOT NULL,
  payment_method_id UUID REFERENCES payment_methods(id) NOT NULL,

  amount DECIMAL(10,2) NOT NULL,

  -- DATI EXTRA (per carte, satispay, ecc.)
  transaction_id TEXT, -- ID transazione POS
  card_last_digits TEXT, -- Ultime 4 cifre carta

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. CHIUSURE FISCALI (X e Z)
-- ============================================
CREATE TABLE IF NOT EXISTS fiscal_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,

  closure_type TEXT NOT NULL CHECK (closure_type IN ('X', 'Z')),
  -- X: lettura intermedia (non azzera, può essere fatta più volte)
  -- Z: chiusura giornaliera (azzera progressivi, una sola volta al giorno)

  closure_number INTEGER, -- Numero progressivo chiusura Z (null per X)

  -- PERIODO
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- TOTALI
  total_receipts INTEGER NOT NULL DEFAULT 0, -- Numero scontrini
  total_refunds INTEGER DEFAULT 0,
  total_voids INTEGER DEFAULT 0,

  gross_sales DECIMAL(10,2) NOT NULL, -- Vendite lorde
  refunds_amount DECIMAL(10,2) DEFAULT 0, -- Resi
  net_sales DECIMAL(10,2) NOT NULL, -- Vendite nette (gross - refunds)

  total_tax DECIMAL(10,2) NOT NULL, -- IVA totale
  total_net DECIMAL(10,2) NOT NULL, -- Imponibile totale

  -- BREAKDOWN PER ALIQUOTA IVA
  tax_breakdown JSONB NOT NULL,
  -- {
  --   "22": { rate: 22, net: 1000, tax: 220, gross: 1220, receipts: 45 },
  --   "10": { rate: 10, net: 500, tax: 50, gross: 550, receipts: 23 }
  -- }

  -- BREAKDOWN PER METODO PAGAMENTO
  payment_breakdown JSONB NOT NULL,
  -- {
  --   "Contanti": { amount: 800, count: 30 },
  --   "Carta": { amount: 500, count: 25 }
  -- }

  -- OPERATORE CHE HA FATTO LA CHIUSURA
  operator_id UUID REFERENCES restaurant_staff(id),
  operator_name TEXT,

  -- STATO
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'transmitted', 'error')),
  error_message TEXT,

  -- DATI RT
  rt_closure_data JSONB, -- Dati raw dal RT

  -- TIMESTAMP
  completed_at TIMESTAMP WITH TIME ZONE,
  transmitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. LOG COMUNICAZIONI RT
-- ============================================
CREATE TABLE IF NOT EXISTS rt_communication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,

  -- TIPO COMANDO
  command_type TEXT NOT NULL CHECK (command_type IN (
    'test_connection',
    'print_receipt',
    'print_preconto',
    'void_receipt',
    'refund_receipt',
    'closure_x',
    'closure_z',
    'get_status',
    'get_last_receipt'
  )),

  -- RIFERIMENTI
  receipt_id UUID REFERENCES fiscal_receipts(id),
  closure_id UUID REFERENCES fiscal_closures(id),

  -- DATI RICHIESTA
  request_data JSONB,

  -- RISPOSTA
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  response_data JSONB,
  error_message TEXT,
  error_code TEXT,

  -- TIMING
  duration_ms INTEGER, -- Millisecondi per completare comando

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. MODELLI RT SUPPORTATI (catalogo)
-- ============================================
CREATE TABLE IF NOT EXISTS rt_models_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  manufacturer TEXT NOT NULL, -- epson, custom, rch, ditron, olivetti
  model_name TEXT NOT NULL,
  model_code TEXT,

  connection_types TEXT[] NOT NULL, -- ['usb', 'ethernet', 'serial']
  protocol TEXT, -- 'escpos', 'xml', 'custom'

  default_port INTEGER, -- 9100 per ethernet
  driver_version TEXT,

  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(manufacturer, model_name)
);

-- ============================================
-- INDICI PER PERFORMANCE
-- ============================================

CREATE INDEX idx_rt_configurations_restaurant ON rt_configurations(restaurant_id);
CREATE INDEX idx_tax_rates_restaurant ON tax_rates(restaurant_id);
CREATE INDEX idx_payment_methods_restaurant ON payment_methods(restaurant_id);

CREATE INDEX idx_fiscal_receipts_restaurant ON fiscal_receipts(restaurant_id);
CREATE INDEX idx_fiscal_receipts_order ON fiscal_receipts(order_id);
CREATE INDEX idx_fiscal_receipts_date ON fiscal_receipts(created_at);
CREATE INDEX idx_fiscal_receipts_status ON fiscal_receipts(status);
CREATE INDEX idx_fiscal_receipts_type ON fiscal_receipts(receipt_type);

CREATE INDEX idx_fiscal_receipt_items_receipt ON fiscal_receipt_items(receipt_id);
CREATE INDEX idx_fiscal_receipt_payments_receipt ON fiscal_receipt_payments(receipt_id);

CREATE INDEX idx_fiscal_closures_restaurant ON fiscal_closures(restaurant_id);
CREATE INDEX idx_fiscal_closures_date ON fiscal_closures(period_end);
CREATE INDEX idx_fiscal_closures_type ON fiscal_closures(closure_type);

CREATE INDEX idx_rt_logs_restaurant ON rt_communication_logs(restaurant_id);
CREATE INDEX idx_rt_logs_date ON rt_communication_logs(created_at);

-- ============================================
-- TRIGGER PER UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rt_configurations_updated_at BEFORE UPDATE ON rt_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON tax_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fiscal_receipts_updated_at BEFORE UPDATE ON fiscal_receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATI INIZIALI: MODELLI RT PIÙ COMUNI
-- ============================================

INSERT INTO rt_models_catalog (manufacturer, model_name, model_code, connection_types, protocol, default_port, is_active) VALUES
  -- EPSON
  ('epson', 'FP-81 II', 'FP-81-II', ARRAY['usb', 'ethernet', 'serial'], 'escpos', 9100, true),
  ('epson', 'FP-90 III', 'FP-90-III', ARRAY['usb', 'ethernet'], 'escpos', 9100, true),
  ('epson', 'FP-81 II RT', 'FP-81-II-RT', ARRAY['usb', 'ethernet', 'serial'], 'escpos', 9100, true),

  -- CUSTOM
  ('custom', 'Kube II', 'KUBE-II', ARRAY['usb', 'ethernet'], 'custom', 9100, true),
  ('custom', 'QUATTRO A4', 'QUATTRO-A4', ARRAY['usb', 'ethernet'], 'custom', 9100, true),

  -- RCH
  ('rch', 'Prisma', 'PRISMA', ARRAY['usb', 'ethernet'], 'xml', 9100, true),
  ('rch', 'Sprint', 'SPRINT', ARRAY['usb', 'ethernet'], 'xml', 9100, true),

  -- DITRON
  ('ditron', 'DT-350RT', 'DT-350RT', ARRAY['usb', 'ethernet'], 'escpos', 9100, true),
  ('ditron', 'DT-450RT', 'DT-450RT', ARRAY['usb', 'ethernet'], 'escpos', 9100, true),

  -- OLIVETTI
  ('olivetti', 'Nettuna 7000RT', 'NETTUNA-7000RT', ARRAY['usb', 'ethernet'], 'escpos', 9100, true),
  ('olivetti', 'Nettuna 8000RT', 'NETTUNA-8000RT', ARRAY['usb', 'ethernet'], 'escpos', 9100, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTI TABELLE
-- ============================================

COMMENT ON TABLE rt_configurations IS 'Configurazione RT e dati fiscali per ogni ristorante';
COMMENT ON TABLE tax_rates IS 'Aliquote IVA configurate per il ristorante';
COMMENT ON TABLE payment_methods IS 'Metodi di pagamento disponibili alla cassa';
COMMENT ON TABLE fiscal_receipts IS 'Scontrini fiscali emessi (sale, refund, void, preconto)';
COMMENT ON TABLE fiscal_receipt_items IS 'Prodotti venduti in ogni scontrino';
COMMENT ON TABLE fiscal_receipt_payments IS 'Pagamenti effettuati per ogni scontrino (supporta pagamenti multipli)';
COMMENT ON TABLE fiscal_closures IS 'Chiusure fiscali giornaliere (Z) e intermedie (X)';
COMMENT ON TABLE rt_communication_logs IS 'Log di tutte le comunicazioni con il RT per debug';
COMMENT ON TABLE rt_models_catalog IS 'Catalogo modelli RT supportati dall applicazione';
