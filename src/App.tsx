import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { AuthScreen } from './components/AuthScreen'
import { SetupScreen } from './components/SetupScreen'
import { Workspace } from './components/Workspace'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      setReady(true)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (!isSupabaseConfigured) return <SetupScreen />
  if (!ready) {
    return (
      <div className="splash">
        <span className="spinner" />
        <p>Menyiapkan catatan…</p>
      </div>
    )
  }
  if (!session) return <AuthScreen />

  return (
    <Workspace
      userId={session.user.id}
      email={session.user.email ?? ''}
      onSignOut={() => {
        void supabase?.auth.signOut()
      }}
    />
  )
}
