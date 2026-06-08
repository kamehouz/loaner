import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

const validUrl = url && url.startsWith('http')

export const missingConfig = !validUrl || !key
export const configError = !validUrl && url
  ? `VITE_SUPABASE_URL looks wrong: "${url}". It must start with https://`
  : null

export const supabase = createClient(
  validUrl ? url : 'https://placeholder.supabase.co',
  key || 'placeholder-key'
)
