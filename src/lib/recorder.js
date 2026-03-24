/**
 * MediaRecorder wrapper with Web Audio API analyser for waveform visualisation.
 */
export class MeetingRecorder {
  constructor() {
    this.mediaRecorder = null
    this.audioContext = null
    this.analyser = null
    this.stream = null
    this.chunks = []
    this.startTime = null
    this.pausedAt = null
    this.totalPausedMs = 0
    this.onDataAvailable = null // callback(blob)
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const source = this.audioContext.createMediaStreamSource(this.stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8
    source.connect(this.analyser)

    this.chunks = []
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: this._mimeType() })
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.mediaRecorder.start(250) // collect every 250ms
    this.startTime = Date.now()
    this.totalPausedMs = 0
  }

  pause() {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause()
      this.pausedAt = Date.now()
    }
  }

  resume() {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume()
      if (this.pausedAt) {
        this.totalPausedMs += Date.now() - this.pausedAt
        this.pausedAt = null
      }
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) return resolve(null)

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this._mimeType() })
        const durationMs = Date.now() - this.startTime - this.totalPausedMs
        this._cleanup()
        resolve({ blob, durationMs })
      }
      this.mediaRecorder.stop()
      this.stream?.getTracks().forEach(t => t.stop())
    })
  }

  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(0)
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  getElapsedMs() {
    if (!this.startTime) return 0
    const now = Date.now()
    const paused = this.pausedAt ? now - this.pausedAt : 0
    return now - this.startTime - this.totalPausedMs - paused
  }

  isPaused() {
    return this.mediaRecorder?.state === 'paused'
  }

  isRecording() {
    return this.mediaRecorder?.state === 'recording'
  }

  _mimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
    return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
  }

  _cleanup() {
    this.audioContext?.close()
    this.audioContext = null
    this.analyser = null
    this.stream = null
    this.mediaRecorder = null
    this.startTime = null
    this.pausedAt = null
    this.totalPausedMs = 0
    this.chunks = []
  }
}
