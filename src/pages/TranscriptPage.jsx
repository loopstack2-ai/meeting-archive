import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TranscriptEntry from '../components/TranscriptEntry'
import ShareModal from '../components/ShareModal'
import { LANGUAGES, translateSegments } from '../lib/translate'

const STATUS_LABELS = {
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'COMPLETED' },
  processing: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PROCESSING' },
  recording: { bg: 'bg-red-100', text: 'text-red-700', label: 'LIVE' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function TranscriptPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [speakers, setSpeakers] = useState({}) // { label: name }
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState(null) // label being edited
  const audioRef = useRef(null)
  const [playingSegment, setPlayingSegment] = useState(null)
  const [selectedLang, setSelectedLang] = useState('en')
  const [translatedTranscript, setTranslatedTranscript] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [translateProgress, setTranslateProgress] = useState(0)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    const [{ data: m }, { data: t }, { data: s }] = await Promise.all([
      supabase.from('meetings').select('*').eq('id', id).single(),
      supabase.from('transcripts').select('*').eq('meeting_id', id).order('start_time'),
      supabase.from('speakers').select('*').eq('meeting_id', id),
    ])
    setMeeting(m)
    setTranscript(t || [])

    // Build speaker name map
    const map = {}
    s?.forEach(sp => { map[sp.label] = sp.name })
    setSpeakers(map)
    setLoading(false)
  }

  async function saveSpeakerName(label, name) {
    setSpeakers(prev => ({ ...prev, [label]: name }))
    setEditingSpeaker(null)

    // Upsert into speakers table
    await supabase.from('speakers').upsert({
      meeting_id: id,
      label,
      name,
    }, { onConflict: 'meeting_id,label' })
  }

  function playSegment(entry) {
    if (!meeting?.storage_path) return
    const { data } = supabase.storage.from('recordings').getPublicUrl(meeting.storage_path)
    if (!data?.publicUrl) return

    setPlayingSegment(entry.id)
    const audio = new Audio(data.publicUrl)
    audio.currentTime = entry.start_time
    audio.play()
    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime >= entry.end_time) {
        audio.pause()
        setPlayingSegment(null)
      }
    })
    audioRef.current = audio
  }

  async function handleLanguageChange(lang) {
    setSelectedLang(lang)
    if (lang === 'en') {
      setTranslatedTranscript(null)
      return
    }
    setTranslating(true)
    setTranslateProgress(0)
    try {
      const result = await translateSegments(transcript, lang, (done, total) => {
        setTranslateProgress(Math.round((done / total) * 100))
      })
      setTranslatedTranscript(result)
    } catch (err) {
      console.error('Translation failed:', err)
    } finally {
      setTranslating(false)
    }
  }

  const activeTranscript = translatedTranscript || transcript
  const uniqueSpeakers = [...new Set(transcript.map(t => t.speaker_label))]
  const filtered = search.trim()
    ? activeTranscript.filter(t => t.text.toLowerCase().includes(search.toLowerCase()))
    : activeTranscript

  const status = STATUS_LABELS[meeting?.status] || STATUS_LABELS.completed

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F0F2F5]">
        <div className="w-6 h-6 border-2 border-[#0D6E6E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F0F2F5] px-6 text-center">
        <div>
          <p className="text-gray-500 mb-4">Meeting not found.</p>
          <button onClick={() => navigate('/')} className="text-[#0D6E6E] font-semibold text-sm">← Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#F0F2F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-500">
            <BackIcon />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <WaveIcon />
            <span className="text-[#0D6E6E] font-bold text-sm truncate">Meeting Archive</span>
          </div>
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-gray-500">
            <SearchIcon />
          </button>
          <button className="p-2 text-gray-500">
            <MoreIcon />
          </button>
        </div>

        {showSearch && (
          <div className="mt-2">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transcript…"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0D6E6E]"
            />
          </div>
        )}
      </div>

      {/* Meeting meta */}
      <div className="mx-4 mt-4 bg-white rounded-2xl px-5 py-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{formatDate(meeting.created_at)}</p>
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{meeting.title}</h1>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
          <Stat label="Duration" value={formatDuration(meeting.duration_seconds)} />
          {meeting.file_size_bytes && (
            <Stat label="Size" value={`${(meeting.file_size_bytes / 1e6).toFixed(1)} MB`} />
          )}
          <Stat label="Speakers" value={`${uniqueSpeakers.length}`} />
        </div>

        {/* Speaker names (editable) */}
        {uniqueSpeakers.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-2">
            {uniqueSpeakers.map(label => (
              <SpeakerChip
                key={label}
                label={label}
                name={speakers[label]}
                isEditing={editingSpeaker === label}
                onEdit={() => setEditingSpeaker(label)}
                onSave={(name) => saveSpeakerName(label, name)}
                onCancel={() => setEditingSpeaker(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="flex-1 mx-4 mt-3 mb-36 bg-white rounded-2xl px-4 divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {search ? 'No results found.' : 'No transcript available yet.'}
          </div>
        ) : (
          filtered.map(entry => (
            <div key={entry.id} className="relative group">
              <TranscriptEntry
                entry={entry}
                speakerName={speakers[entry.speaker_label]}
              />
              {/* Play segment button */}
              {meeting.storage_path && (
                <button
                  onClick={() => playSegment(entry)}
                  className={`absolute right-0 top-3 p-1.5 rounded-full transition ${
                    playingSegment === entry.id
                      ? 'bg-[#0D6E6E] text-white'
                      : 'text-gray-300 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {playingSegment === entry.id ? <PauseSmIcon /> : <PlaySmIcon />}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 pt-3 pb-4 flex flex-col gap-2">
        {/* Language selector */}
        <div className="flex items-center gap-2">
          <GlobeIcon />
          <select
            value={selectedLang}
            onChange={e => handleLanguageChange(e.target.value)}
            disabled={translating || transcript.length === 0}
            className="flex-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0D6E6E] disabled:opacity-50"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          {translating && (
            <span className="text-xs text-[#0D6E6E] font-medium shrink-0">
              {translateProgress}%
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <button className="flex-1 border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl py-3 active:scale-[0.98] transition">
            Edit
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="flex-1 bg-[#0D6E6E] text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <ShareIcon />
            Share
          </button>
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <ShareModal
          meeting={meeting}
          transcript={transcript}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value}</p>
    </div>
  )
}

function SpeakerChip({ label, name, isEditing, onEdit, onSave, onCancel }) {
  const [draft, setDraft] = useState(name || label)

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 bg-[#0D6E6E]/5 border border-[#0D6E6E]/20 rounded-full px-2 py-1">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSave(draft)
            if (e.key === 'Escape') onCancel()
          }}
          className="text-xs w-24 bg-transparent outline-none text-gray-900 font-medium"
        />
        <button onClick={() => onSave(draft)} className="text-[#0D6E6E]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
        <button onClick={onCancel} className="text-gray-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m18 6-12 12M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onEdit}
      className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 active:bg-gray-100 transition"
    >
      <span className="text-xs text-gray-600 font-medium">{name || label}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    </button>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function WaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="10" width="3" height="8" rx="1.5" fill="#0D6E6E" />
      <rect x="8" y="6" width="3" height="16" rx="1.5" fill="#0D6E6E" />
      <rect x="13" y="3" width="3" height="22" rx="1.5" fill="#0D6E6E" />
      <rect x="18" y="7" width="3" height="14" rx="1.5" fill="#0D6E6E" />
      <rect x="23" y="11" width="3" height="6" rx="1.5" fill="#0D6E6E" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  )
}

function PlaySmIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function PauseSmIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D6E6E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}
