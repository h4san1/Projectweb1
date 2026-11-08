import { useState, type FormEvent } from 'react'
import { db } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { Icon } from './Icon'

type Mode = 'signin' | 'signup'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)
    setNotice(null)

    try {
      const client = db()
      if (mode === 'signin') {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      } else {
        const { data, error: signUpError } = await client.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        if (!data.session) {
          setNotice('Akun dibuat. Buka email konfirmasi dari Supabase, lalu masuk di sini.')
          setMode('signin')
          setPassword('')
        }
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-visual" aria-hidden="true">
        <div className="auth-note auth-note--1" />
        <div className="auth-note auth-note--2" />
        <div className="auth-note auth-note--3" />
      </div>

      <div className="auth-card">
        <div className="brand brand--lg">
          <span className="brand-mark">
            <Icon name="notes" size={22} />
          </span>
          <span className="brand-text">
            <strong>Catat</strong>
            <small>Catatan ringan untuk ide harian</small>
          </span>
        </div>

        <div className="tabs" role="tablist" aria-label="Pilih mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={mode === 'signin' ? 'is-active' : ''}
            onClick={() => switchMode('signin')}
          >
            Masuk
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={mode === 'signup' ? 'is-active' : ''}
            onClick={() => switchMode('signup')}
          >
            Daftar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="kamu@contoh.com"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 6 karakter"
            />
          </label>

          {error && <p className="alert alert--error">{error}</p>}
          {notice && <p className="alert alert--ok">{notice}</p>}

          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? 'Memproses…' : mode === 'signin' ? 'Masuk ke catatan' : 'Buat akun'}
          </button>
        </form>

        <p className="auth-foot">
          Data kamu disimpan di Supabase dan hanya bisa dibaca oleh akun kamu sendiri.
        </p>
      </div>
    </div>
  )
}
