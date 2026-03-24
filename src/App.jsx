import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RecordingPage from './pages/RecordingPage'
import TranscriptPage from './pages/TranscriptPage'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0D6E6E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/" element={session ? <DashboardPage /> : <Navigate to="/login" replace />} />
          <Route path="/record" element={session ? <RecordingPage /> : <Navigate to="/login" replace />} />
          <Route path="/transcript/:id" element={session ? <TranscriptPage /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
