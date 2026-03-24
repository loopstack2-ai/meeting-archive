import { useState } from 'react'
import { supabase } from '../lib/supabase'

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Props:
 *   meeting    — meeting row
 *   transcript — array of transcript entries
 *   onClose    — fn()
 */
export default function ShareModal({ meeting, transcript, onClose }) {
  const [activeTab, setActiveTab] = useState('recording')
  const [copied, setCopied] = useState(false)

  const fileMB = meeting?.file_size_bytes ? (meeting.file_size_bytes / 1e6).toFixed(1) : '—'
  const duration = formatDuration(meeting?.duration_seconds)

  const summary = transcript
    .slice(0, 5)
    .map(t => `${t.speaker_label}: ${t.text}`)
    .join('\n')

  async function getPublicUrl() {
    if (!meeting?.storage_path) return null
    const { data } = supabase.storage.from('recordings').getPublicUrl(meeting.storage_path)
    return data.publicUrl
  }

  async function shareViaEmail() {
    const url = await getPublicUrl()
    const body = encodeURIComponent(
      `Meeting: ${meeting.title}\nDuration: ${duration}\n\nSummary:\n${summary}\n\n${url || ''}`
    )
    const subject = encodeURIComponent(`Meeting Recording: ${meeting.title}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  async function shareViaWhatsApp() {
    const url = await getPublicUrl()
    const text = encodeURIComponent(
      `📋 *${meeting.title}* (${duration})\n\n${summary}\n\n${url || ''}`
    )
    window.open(`https://wa.me/?text=${text}`)
  }

  async function saveToDevice() {
    const url = await getPublicUrl()
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `${meeting.title.replace(/\s+/g, '_')}.webm`
    a.click()
  }

  async function copyLink() {
    const url = await getPublicUrl()
    if (url) {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-50 pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 px-6 pt-2 pb-4 border-b border-gray-100">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{duration}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{fileMB} <span className="text-sm font-semibold">MB</span></p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">File Size</p>
          </div>
          <div className="ml-auto">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="px-6 pt-4 pb-3">
          <h3 className="text-lg font-bold text-gray-900">Share Recording</h3>
          <p className="text-xs text-gray-400 mt-0.5">Executive Summary &amp; Audio Archive</p>
        </div>

        {/* Share options */}
        <div className="px-4 flex flex-col gap-3 pb-4">
          <button
            onClick={shareViaEmail}
            className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition"
          >
            <div className="w-10 h-10 bg-[#0D6E6E] rounded-xl flex items-center justify-center shrink-0">
              <EmailIcon />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Send via Email</p>
              <p className="text-xs text-gray-400">Quick audio snippet &amp; summary</p>
            </div>
            <ChevronIcon />
          </button>

          <button
            onClick={shareViaWhatsApp}
            className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition"
          >
            <div className="w-10 h-10 bg-[#25D366] rounded-xl flex items-center justify-center shrink-0">
              <WhatsAppIcon />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Send via WhatsApp</p>
              <p className="text-xs text-gray-400">Quick audio snippet &amp; summary</p>
            </div>
            <ChevronIcon />
          </button>
        </div>

        {/* Secondary actions */}
        <div className="flex gap-4 px-6 py-3 border-t border-gray-100">
          <button
            onClick={saveToDevice}
            className="flex-1 text-center text-xs font-semibold text-gray-600 py-2"
          >
            Save to device
          </button>
          <div className="w-px bg-gray-200" />
          <button
            onClick={copyLink}
            className="flex-1 text-center text-xs font-semibold text-[#0D6E6E] py-2"
          >
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100">
          {['recording', 'options'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition ${
                activeTab === tab ? 'text-[#0D6E6E] border-t-2 border-[#0D6E6E] -mt-px' : 'text-gray-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="m18 6-12 12M6 6l12 12" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-gray-300">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
