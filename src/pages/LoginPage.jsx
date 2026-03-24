import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Check your email to confirm your account.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#F0F2F5]">
      {/* Header */}
      <div className="px-6 pt-14 pb-10">
        <div className="flex items-center gap-2 mb-10">
          <WaveIcon />
          <span className="text-[#0D6E6E] font-bold text-lg tracking-tight">Meeting Archive</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
          {mode === 'login' ? 'Welcome back.' : 'Create account.'}
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          {mode === 'login'
            ? 'Sign in to access your meetings.'
            : 'Start recording and transcribing your meetings.'}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0D6E6E] focus:ring-2 focus:ring-[#0D6E6E]/10 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0D6E6E] focus:ring-2 focus:ring-[#0D6E6E]/10 transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D6E6E] text-white font-semibold rounded-xl py-3.5 mt-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === 'login' ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
            className="text-[#0D6E6E] font-semibold"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

function WaveIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="10" width="3" height="8" rx="1.5" fill="#0D6E6E" />
      <rect x="8" y="6" width="3" height="16" rx="1.5" fill="#0D6E6E" />
      <rect x="13" y="3" width="3" height="22" rx="1.5" fill="#0D6E6E" />
      <rect x="18" y="7" width="3" height="14" rx="1.5" fill="#0D6E6E" />
      <rect x="23" y="11" width="3" height="6" rx="1.5" fill="#0D6E6E" />
    </svg>
  )
}
