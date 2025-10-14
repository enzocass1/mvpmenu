import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nfpgqvnfmypeyrlplqem.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcGdxdm5mbXlwZXlybHBscWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDE0OTMsImV4cCI6MjA3NjAxNzQ5M30.1WynYpt8Q_0I8g7CTl0Dgnf5f6qAVgFWo-gfWGFMZvE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)