import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_COLORS = {
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'COMPLETED' },
  processing: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PROCESSING' },
  recording: { bg: 'bg-red-100', text: 'text-red-700', label: 'LIVE' },
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    fetchMeetings()
  }, [])

  async function fetchMeetings() {
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setMeetings(data || [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#F0F2F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WaveIcon />
            <span className="text-[#0D6E6E] font-bold text-base tracking-tight">Meeting Archive</span>
          </div>
          <button onClick={handleSignOut} className="text-xs text-gray-400 font-medium py-1 px-3 rounded-full border border-gray-200">
            Sign out
          </button>
        </div>
        <div className="mt-4">
          <p className="text-xs text-gray-400">
            {user?.email}
          </p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Your Meetings</h1>
        </div>
      </div>

      {/* Meeting list */}
      <div className="flex-1 px-4 pt-4 pb-28">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#0D6E6E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-[#0D6E6E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MicIcon color="#0D6E6E" size={28} />
            </div>
            <h2 className="text-gray-900 font-semibold text-base mb-1">No meetings yet</h2>
            <p className="text-gray-400 text-sm">Tap the record button to start your first meeting.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {meetings.map(m => {
              const status = STATUS_COLORS[m.status] || STATUS_COLORS.completed
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(`/transcript/${m.id}`)}
                  className="bg-white rounded-2xl p-4 text-left shadow-sm active:scale-[0.98] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                        {formatDate(m.created_at)}
                      </p>
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">{m.title}</h3>
                      {m.location && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <PinIcon /> {m.location}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                    <Stat icon={<ClockIcon />} value={formatDuration(m.duration_seconds)} />
                    {m.file_size_bytes && (
                      <Stat icon={<FileIcon />} value={`${(m.file_size_bytes / 1e6).toFixed(1)} MB`} />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <button
          onClick={() => navigate('/record')}
          className="flex items-center gap-2.5 bg-[#0D6E6E] text-white font-semibold text-sm px-6 py-4 rounded-full shadow-lg shadow-[#0D6E6E]/30 active:scale-95 transition"
        >
          <MicIcon color="white" size={18} />
          New Recording
        </button>
      </div>
    </div>
  )
}

function Stat({ icon, value }) {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      {icon}
      <span>{value}</span>
    </div>
  )
}

function WaveIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="10" width="3" height="8" rx="1.5" fill="#0D6E6E" />
      <rect x="8" y="6" width="3" height="16" rx="1.5" fill="#0D6E6E" />
      <rect x="13" y="3" width="3" height="22" rx="1.5" fill="#0D6E6E" />
      <rect x="18" y="7" width="3" height="14" rx="1.5" fill="#0D6E6E" />
      <rect x="23" y="11" width="3" height="6" rx="1.5" fill="#0D6E6E" />
    </svg>
  )
}

function MicIcon({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
