const AVATAR_COLORS = ['#0D6E6E', '#2D6A4F', '#5C4B8A', '#8B4513', '#1A5276']

function speakerColor(label) {
  const index = parseInt(label.replace(/\D/g, ''), 10) || 0
  return AVATAR_COLORS[(index - 1) % AVATAR_COLORS.length]
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Props:
 *   entry     — { speaker_label, text, start_time, end_time, is_key_quote }
 *   speakerName — string (editable name override)
 */
export default function TranscriptEntry({ entry, speakerName }) {
  const color = speakerColor(entry.speaker_label)
  const initial = (speakerName || entry.speaker_label).charAt(0).toUpperCase()
  const displayName = speakerName || entry.speaker_label

  return (
    <div className="flex gap-3 py-3">
      {/* Avatar */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
        style={{ background: color }}
      >
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-700">{displayName}</span>
          <span className="text-[10px] text-gray-400">{formatTime(entry.start_time)}</span>
        </div>

        {entry.is_key_quote ? (
          <p className="text-sm text-gray-800 italic leading-relaxed border-l-2 border-[#0D6E6E] pl-3">
            "{entry.text}"
          </p>
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed">{entry.text}</p>
        )}
      </div>
    </div>
  )
}
