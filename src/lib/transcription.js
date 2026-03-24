/**
 * AssemblyAI transcription integration.
 * Uploads audio blob → polls for completion → returns transcript segments.
 */
const ASSEMBLYAI_URL = 'https://api.assemblyai.com/v2'

async function getHeaders() {
  return {
    authorization: import.meta.env.VITE_ASSEMBLYAI_KEY || '',
    'content-type': 'application/json',
  }
}

export async function uploadAudio(blob) {
  const headers = await getHeaders()
  const uploadHeaders = { authorization: headers.authorization, 'content-type': blob.type }

  const res = await fetch(`${ASSEMBLYAI_URL}/upload`, {
    method: 'POST',
    headers: uploadHeaders,
    body: blob,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
  const { upload_url } = await res.json()
  return upload_url
}

export async function requestTranscription(audioUrl) {
  const headers = await getHeaders()
  const res = await fetch(`${ASSEMBLYAI_URL}/transcript`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('AssemblyAI transcript error:', err)
    throw new Error(`Transcription request failed: ${JSON.stringify(err)}`)
  }
  const data = await res.json()
  return data.id
}

export async function pollTranscript(transcriptId, onProgress) {
  const headers = await getHeaders()
  while (true) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(`${ASSEMBLYAI_URL}/transcript/${transcriptId}`, { headers })
    if (!res.ok) throw new Error(`Poll failed: ${res.statusText}`)
    const data = await res.json()

    if (data.status === 'completed') {
      return parseSegments(data)
    } else if (data.status === 'error') {
      throw new Error(`Transcription error: ${data.error}`)
    }
    onProgress?.(data.status)
  }
}

function parseSegments(data) {
  if (!data.utterances) return []
  return data.utterances.map((u) => ({
    speaker_label: `Speaker ${u.speaker}`,
    text: u.text,
    start_time: u.start / 1000,
    end_time: u.end / 1000,
    is_key_quote: u.words?.some(w => w.confidence > 0.98) || false,
  }))
}

export async function transcribeBlob(blob, onProgress) {
  onProgress?.('uploading')
  const audioUrl = await uploadAudio(blob)
  onProgress?.('queued')
  const id = await requestTranscription(audioUrl)
  return pollTranscript(id, onProgress)
}
