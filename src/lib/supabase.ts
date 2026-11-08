import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** Nilai contoh dari .env.example tidak dianggap konfigurasi yang sah. */
const isPlaceholder = (value: string) =>
  value === '' || value.includes('xxxxxxxx') || value.includes('your-project') || value.includes('contoh')

export const isSupabaseConfigured =
  !isPlaceholder(rawUrl) &&
  !isPlaceholder(rawKey) &&
  /^https?:\/\//.test(rawUrl) &&
  rawKey.length > 20

const url = rawUrl.replace(/\/+$/, '')

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function db(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}

export const MEDIA_BUCKET = 'media'
