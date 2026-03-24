/**
 * Translation via MyMemory public API — no key required.
 * https://mymemory.translated.net/doc/spec.php
 */

export const LANGUAGES = [
  { code: 'en', label: 'Original (English)' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ja', label: 'Japanese' },
]

async function translateText(text, targetLang) {
  if (!text?.trim()) return text
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Translation request failed')
  const data = await res.json()
  return data.responseData?.translatedText || text
}

/**
 * Translates an array of transcript segments.
 * Batches requests with a small delay to avoid rate limiting.
 */
export async function translateSegments(segments, targetLang, onProgress) {
  const results = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const translated = await translateText(seg.text, targetLang)
    results.push({ ...seg, text: translated })
    onProgress?.(i + 1, segments.length)
    // Small delay to be polite to the free API
    if (i < segments.length - 1) await new Promise(r => setTimeout(r, 150))
  }
  return results
}
