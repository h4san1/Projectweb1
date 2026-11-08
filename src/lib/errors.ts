const MESSAGES: Record<string, string> = {
  'invalid login credentials': 'Email atau password salah.',
  'email not confirmed': 'Email belum dikonfirmasi. Buka tautan konfirmasi di kotak masuk kamu.',
  'user already registered': 'Email ini sudah terdaftar. Coba masuk.',
  'password should be at least 6 characters': 'Password minimal 6 karakter.',
  'email rate limit exceeded': 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  'failed to fetch': 'Tidak bisa terhubung ke Supabase. Periksa koneksi internet dan URL proyek.',
  'invalid api key': 'Anon key Supabase tidak valid. Salin ulang dari dashboard.',
  'new row violates row-level security policy':
    'Akses ditolak oleh kebijakan keamanan Supabase. Pastikan supabase/schema.sql sudah dijalankan.',
  'bucket not found': 'Bucket storage "media" belum ada. Jalankan supabase/schema.sql.',
  'jwt expired': 'Sesi sudah kedaluwarsa. Silakan masuk lagi.',
}

export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!raw) return 'Terjadi kesalahan. Coba lagi.'

  const lower = raw.toLowerCase()
  for (const [needle, message] of Object.entries(MESSAGES)) {
    if (lower.includes(needle)) return message
  }
  return raw
}
