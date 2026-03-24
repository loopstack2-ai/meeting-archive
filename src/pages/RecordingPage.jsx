import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MeetingRecorder } from '../lib/recorder'
import { transcribeBlob } from '../lib/transcription'
import Waveform from '../components/Waveform'

function formatTimer(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  const centiseconds = Math.floor((ms % 1000) / 10).toString().padStart(2, '0')
  return { minutes, seconds, centiseconds }
}

export default function RecordingPage() {
  const navigate = useNavigate()
  const recorderRef = useRef(new MeetingRecorder())
  const timerRef = useRef(null)

  const [phase, setPhase] = useState('setup') // setup | recording | paused | stopping | processing
  const [elapsed, setElapsed] = useState(0)
  const [title, setTitle] = useState('Product Sync')
  const [location, setLocation] = useState('Main Conference Room')
  const [flags, setFlags] = useState([])
  const [transcribeStatus, setTranscribeStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      if (recorderRef.current.isRecording()) {
        recorderRef.current.stop()
      }
    }
  }, [])

  async function startRecording() {
    setError('')
    try {
      await recorderRef.current.start()
      setPhase('recording')
      timerRef.current = setInterval(() => {
        setElapsed(recorderRef.current.getElapsedMs())
      }, 50)
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access.')
    }
  }

  function togglePause() {
    if (phase === 'recording') {
      recorderRef.current.pause()
      setPhase('paused')
    } else if (phase === 'paused') {
      recorderRef.current.resume()
      setPhase('recording')
    }
  }

  function addFlag() {
    setFlags(f => [...f, recorderRef.current.getElapsedMs()])
  }

  async function stopRecording() {
    setPhase('stopping')
    clearInterval(timerRef.current)

    const result = await recorderRef.current.stop()
    if (!result) { navigate('/'); return }

    const { blob, durationMs } = result
    setPhase('processing')

    try {
      // Save meeting record
      const { data: { user } } = await supabase.auth.getUser()
      const filename = `${user.id}/${Date.now()}.webm`

      const { error: uploadErr } = await supabase.storage
        .from('recordings')
        .upload(filename, blob, { contentType: blob.type })
      if (uploadErr) throw uploadErr

      const { data: meeting, error: meetingErr } = await supabase
        .from('meetings')
        .insert({
          user_id: user.id,
          title,
          location,
          duration_seconds: Math.floor(durationMs / 1000),
          file_size_bytes: blob.size,
          status: 'processing',
          storage_path: filename,
        })
        .select()
        .single()
      if (meetingErr) throw meetingErr

      // Transcribe
      setTranscribeStatus('Uploading audio…')
      const segments = await transcribeBlob(blob, (status) => {
        const labels = {
          uploading: 'Uploading audio…',
          queued: 'Queued for transcription…',
          processing: 'Transcribing…',
        }
        setTranscribeStatus(labels[status] || status)
      })

      // Save segments
      if (segments.length > 0) {
        await supabase.from('transcripts').insert(
          segments.map(s => ({ ...s, meeting_id: meeting.id }))
        )
      }

      // Mark complete
      await supabase.from('meetings').update({ status: 'completed' }).eq('id', meeting.id)

      navigate(`/transcript/${meeting.id}`)
    } catch (err) {
      console.error(err)
      setError(`Error: ${err.message}`)
      setPhase('recording')
    }
  }

  const getFrequencyData = useCallback(
    () => recorderRef.current.getFrequencyData(),
    []
  )

  const timer = formatTimer(elapsed)
  const isActive = phase === 'recording' || phase === 'paused'

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-dvh flex flex-col bg-[#F0F2F5]">
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-500">
            <BackIcon />
          </button>
          <div className="flex items-center gap-1.5">
            <WaveIcon />
            <span className="text-[#0D6E6E] font-bold text-sm">Meeting Archive</span>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex-1 px-5 pt-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">New Recording</h1>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                Meeting Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Product Sync"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0D6E6E] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                Location
              </label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Main Conference Room"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0D6E6E] transition"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 pb-10">
          <button
            onClick={startRecording}
            className="w-full bg-[#0D6E6E] text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2.5 shadow-lg shadow-[#0D6E6E]/20 active:scale-[0.98] transition"
          >
            <MicIcon color="white" size={20} />
            Start Recording
          </button>
        </div>
      </div>
    )
  }

  // ── Processing screen ──────────────────────────────────────────────────────
  if (phase === 'processing' || phase === 'stopping') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F0F2F5] px-8">
        <div className="w-16 h-16 bg-[#0D6E6E]/10 rounded-full flex items-center justify-center mb-5">
          <div className="w-8 h-8 border-3 border-[#0D6E6E] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {phase === 'stopping' ? 'Saving recording…' : 'Transcribing meeting'}
        </h2>
        <p className="text-sm text-gray-400 text-center">{transcribeStatus || 'Please wait, this may take a minute.'}</p>
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}
      </div>
    )
  }

  // ── Recording / Paused screen ──────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col bg-[#F0F2F5]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2">
        <div className="flex items-center gap-1.5">
          <WaveIcon />
          <span className="text-[#0D6E6E] font-bold text-sm">Meeting Archive</span>
        </div>
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1">
          <span className="live-dot w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-600 font-bold text-xs tracking-widest">
            {phase === 'paused' ? 'PAUSED' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* Session info */}
      <div className="mx-4 mt-4 bg-white rounded-2xl px-5 py-4 text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Current Session</p>
        <h2 className="text-xl font-bold text-gray-900 leading-snug">Recording Meeting:<br />{title}</h2>
        {location && (
          <p className="text-sm text-gray-400 mt-1.5 flex items-center justify-center gap-1">
            <PinIcon />
            {location}
          </p>
        )}
      </div>

      {/* Timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="text-center mb-1" aria-live="polite">
          <span className="font-bold text-[#0D6E6E] leading-none" style={{ fontSize: 'clamp(64px, 20vw, 96px)' }}>
            {timer.minutes}:{timer.seconds}
            <span style={{ fontSize: 'clamp(36px, 10vw, 52px)' }}>.{timer.centiseconds}</span>
          </span>
        </div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-8">Duration</p>

        {/* Waveform */}
        <div className="w-full px-2">
          <Waveform
            getFrequencyData={getFrequencyData}
            isRecording={phase === 'recording'}
            isPaused={phase === 'paused'}
          />
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {flags.map((f, i) => {
              const { minutes, seconds } = formatTimer(f)
              return (
                <span key={i} className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                  🚩 {minutes}:{seconds}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mx-4 mb-10 bg-white rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm">
        <button
          onClick={togglePause}
          className="flex flex-col items-center gap-1.5 text-gray-600 active:scale-90 transition"
        >
          {phase === 'paused' ? <PlayIcon /> : <PauseIcon />}
          <span className="text-[10px] font-bold uppercase tracking-widest">{phase === 'paused' ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          onClick={stopRecording}
          className="w-20 h-20 rounded-full bg-[#8B1A1A] flex items-center justify-center shadow-lg shadow-[#8B1A1A]/30 active:scale-95 transition"
          aria-label="Stop recording"
        >
          <div className="w-8 h-8 bg-white rounded-md" />
        </button>

        <button
          onClick={addFlag}
          className="flex flex-col items-center gap-1.5 text-gray-600 active:scale-90 transition"
        >
          <FlagIcon />
          <span className="text-[10px] font-bold uppercase tracking-widest">Flag</span>
        </button>
      </div>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────
function WaveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="10" width="3" height="8" rx="1.5" fill="#0D6E6E" />
      <rect x="8" y="6" width="3" height="16" rx="1.5" fill="#0D6E6E" />
      <rect x="13" y="3" width="3" height="22" rx="1.5" fill="#0D6E6E" />
      <rect x="18" y="7" width="3" height="14" rx="1.5" fill="#0D6E6E" />
      <rect x="23" y="11" width="3" height="6" rx="1.5" fill="#0D6E6E" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function MicIcon({ color, size }) {
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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  )
}
