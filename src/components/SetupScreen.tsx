import { Icon } from './Icon'

export function SetupScreen() {
  return (
    <div className="setup">
      <div className="setup-card">
        <div className="brand brand--lg">
          <span className="brand-mark">
            <Icon name="notes" size={22} />
          </span>
          <span className="brand-text">
            <strong>Catat</strong>
            <small>Supabase belum tersambung</small>
          </span>
        </div>

        <h1>Konfigurasi Supabase dibutuhkan</h1>
        <p className="setup-lead">
          Aplikasi ini memakai Supabase untuk database, autentikasi, dan penyimpanan gambar. Isi dua
          variabel berikut supaya aplikasi bisa jalan.
        </p>

        <ol className="setup-steps">
          <li>
            Buat project gratis di <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">supabase.com</a>.
          </li>
          <li>
            Buka <em>SQL Editor</em>, lalu tempel dan jalankan isi file{' '}
            <code>supabase/schema.sql</code>.
          </li>
          <li>
            Salin <em>Project URL</em> dan <em>anon public key</em> dari <em>Settings → API</em>.
          </li>
          <li>
            Buat file <code>.env.local</code> di root project:
            <pre className="code-block">{`VITE_SUPABASE_URL=https://xxxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}</pre>
          </li>
          <li>
            Jalankan ulang <code>npm run dev</code> (atau deploy ulang ke Cloudflare Pages dengan
            variabel yang sama).
          </li>
        </ol>

        <p className="setup-foot">
          Pada mode lokal, Supabase biasanya mengaktifkan konfirmasi email. Matikan di{' '}
          <em>Authentication → Providers → Email</em> jika ingin langsung masuk setelah daftar.
        </p>
      </div>
    </div>
  )
}
