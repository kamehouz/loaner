import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const missingConfig = !url || !key

// Use placeholder values so createClient doesn't throw at import time —
// App.jsx checks missingConfig and shows a setup error screen instead.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key'
)
