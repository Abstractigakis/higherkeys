import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oofmixahptlnggmvomrp.supabase.co'
const supabaseAnonKey = 'sb_publishable_iAIzDx9qFToOGCdiHMsq5Q_YnO_uIWA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
