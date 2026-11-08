# Catat

Aplikasi catatan sederhana mirip Google Keep: menulis catatan, membuat checklist, menggambar di
kanvas, dan menyimpan foto. Setiap pengguna punya catatan sendiri; data tidak pernah bercampur.

| Bagian | Layanan |
| --- | --- |
| Source code | GitHub |
| Hosting | Cloudflare Pages (static SPA) |
| Database, autentikasi, storage | Supabase |

## Fitur

- **Akun** — daftar/masuk dengan email & password lewat Supabase Auth.
- **Catatan tulisan** — judul + isi teks, tersimpan otomatis saat mengetik.
- **Checklist** — item dengan centang, tambah/hapus, urut sesuai kebutuhan.
- **Gambar** — kanvas dengan pilihan warna, ketebalan, penghapus, dan tombol bersihkan.
- **Foto** — pilih dari perangkat, otomatis diperkecil sebelum diunggah ke Supabase Storage.
- **Rapi-rapi** — sematkan (pin), arsipkan, buang ke sampah, pulihkan, hapus permanen, warna kartu,
  dan pencarian judul/isi/checklist.

## Teknologi

- React 18 + TypeScript + Vite
- `@supabase/supabase-js` (Auth, Postgres, Storage)
- CSS murni (tanpa framework UI)

## Struktur project

```
src/
  App.tsx                  gerbang konfigurasi & sesi
  components/
    Workspace.tsx          daftar catatan, pencarian, tab, overlay editor
    NoteComposer.tsx       form catatan baru (4 jenis)
    NoteEditor.tsx         editor + autosave + aksi pin/arsip/sampah
    DrawingCanvas.tsx      kanvas gambar + toolbar
    ChecklistEditor.tsx    editor checklist
    ImageField.tsx         pemilih foto & pratinjau
    AuthScreen.tsx         masuk / daftar
    SetupScreen.tsx        petunjuk bila env belum diisi
  lib/
    supabase.ts            klien Supabase
    notes.ts               CRUD tabel notes
    media.ts               upload + signed URL storage
    image.ts               kompresi foto, konversi dataURL
    types.ts               tipe & palet warna
supabase/schema.sql        tabel, RLS, bucket storage, policy
public/_redirects          fallback SPA untuk Cloudflare Pages
```

## 1. Siapkan Supabase

1. Buat project di [supabase.com/dashboard](https://supabase.com/dashboard).
2. Buka **SQL Editor** → tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   SQL ini membuat tabel `notes`, trigger `updated_at`, bucket storage privat `media`, beserta semua
   policy keamanan. Aman dijalankan ulang.
3. Buka **Project Settings → API**, salin **Project URL** dan **anon public key**.
4. Agar bisa langsung masuk setelah daftar, buka **Authentication → Providers → Email** dan matikan
   *Confirm email* (opsional; untuk produksi sebaiknya tetap aktif dan atur SMTP).
5. Isi **Authentication → URL Configuration**:
   - *Site URL*: alamat aplikasi (`http://localhost:3000` saat lokal, atau
     `https://<project>.pages.dev` setelah deploy).
   - *Redirect URLs*: tambahkan keduanya.

## 2. Jalankan di lokal

```bash
cp .env.example .env.local      # lalu isi dua variabel di bawah
npm install
npm run dev                     # http://localhost:3000
```

Isi `.env.local`:

```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Tanpa dua variabel ini aplikasi menampilkan halaman petunjuk, bukan error.

Perintah lain:

```bash
npm run typecheck   # TypeScript strict
npm run build       # hasil statis di dist/
npm run preview     # cek hasil build
```

## 3. Deploy ke Cloudflare Pages

**Lewat dashboard (paling mudah)**

1. Hubungkan repository GitHub di **Cloudflare Dashboard → Workers & Pages → Create → Pages →
   Connect to Git**.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Tambahkan environment variables `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` untuk
   *Production* dan *Preview* (dibaca saat build karena Vite menanam nilainya ke bundle).
4. Deploy, lalu perbarui *Site URL* / *Redirect URLs* Supabase dengan domain `*.pages.dev`
   (dan custom domain bila ada).

**Lewat Wrangler**

```bash
npm run build
npx wrangler pages deploy dist --project-name catat
```

File `public/_redirects` berisi `/* /index.html 200` supaya rute SPA tetap bekerja saat refresh.

## Keamanan data

- Semua tabel memakai Row Level Security: `auth.uid() = user_id` untuk select/insert/update/delete.
- Bucket `media` **privat**. Gambar ditampilkan lewat *signed URL* berumur 1 jam yang dibuat untuk
  pengguna yang login, dan policy storage membatasi folder ke `media/<user_id>/…`.
- `anon key` boleh berada di browser karena hanya berisi izin publik; keamanan sebenarnya ada di RLS.
  Jangan pernah memakai `service_role key` di aplikasi frontend.

## Catatan pemakaian

- Gambar kanvas disimpan sebagai PNG setelah berhenti menggambar ±1 detik (atau saat editor ditutup).
- Foto diperkecil ke maksimal 1600 px sisi terpanjang, kualitas JPEG 0.85.
- Menghapus permanen juga menghapus file gambar di storage. Mengganti gambar meninggalkan file lama
  di storage; bersihkan berkala lewat dashboard bila perlu.
