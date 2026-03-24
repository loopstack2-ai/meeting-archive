import { useEffect, useRef } from 'react'

const BAR_COUNT = 40
const BAR_WIDTH = 4
const BAR_GAP = 3
const MIN_HEIGHT = 4
const MAX_HEIGHT = 80
const COLOR_ACTIVE = '#0D6E6E'
const COLOR_DIM = 'rgba(13,110,110,0.25)'

/**
 * Animated waveform visualiser.
 * Props:
 *   getFrequencyData — fn() => Uint8Array  (live from AnalyserNode)
 *   isRecording      — bool
 *   isPaused         — bool
 */
export default function Waveform({ getFrequencyData, isRecording, isPaused }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const idlePhaseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function draw() {
      rafRef.current = requestAnimationFrame(draw)

      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      let heights = new Array(BAR_COUNT).fill(MIN_HEIGHT)

      if (isRecording && !isPaused) {
        const data = getFrequencyData?.() || new Uint8Array(0)
        const step = Math.max(1, Math.floor(data.length / BAR_COUNT))

        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += data[i * step + j] || 0
          const avg = sum / step
          // Map 0-255 → MIN_HEIGHT-MAX_HEIGHT, with some breathing room
          heights[i] = MIN_HEIGHT + (avg / 255) * (MAX_HEIGHT - MIN_HEIGHT)
        }
      } else if (!isRecording) {
        // Idle gentle sine wave
        idlePhaseRef.current += 0.04
        for (let i = 0; i < BAR_COUNT; i++) {
          const wave = Math.sin(idlePhaseRef.current + i * 0.4) * 0.5 + 0.5
          heights[i] = MIN_HEIGHT + wave * 18
        }
      } else {
        // Paused — flat low bars
        heights = heights.map(() => MIN_HEIGHT + 2)
      }

      // Draw bars split into two groups (left 18, gap, right 18) with center 4 bars
      const totalWidth = BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP
      const startX = (W - totalWidth) / 2

      for (let i = 0; i < BAR_COUNT; i++) {
        const h = heights[i]
        const x = startX + i * (BAR_WIDTH + BAR_GAP)
        const y = (H - h) / 2

        // Split gap in the middle (bars 18-21)
        const inMiddleGap = i >= 18 && i <= 21
        const alpha = inMiddleGap ? 0.3 : 1

        ctx.globalAlpha = alpha
        ctx.fillStyle = isRecording && !isPaused ? COLOR_ACTIVE : COLOR_DIM

        // Rounded rect
        const r = BAR_WIDTH / 2
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + BAR_WIDTH - r, y)
        ctx.quadraticCurveTo(x + BAR_WIDTH, y, x + BAR_WIDTH, y + r)
        ctx.lineTo(x + BAR_WIDTH, y + h - r)
        ctx.quadraticCurveTo(x + BAR_WIDTH, y + h, x + BAR_WIDTH - r, y + h)
        ctx.lineTo(x + r, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [isRecording, isPaused, getFrequencyData])

  // Resize canvas to match display size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      const ctx = canvas.getContext('2d')
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '120px' }}
      aria-label="Audio waveform visualisation"
    />
  )
}
