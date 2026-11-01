import express from 'express'
import cors from 'cors'
import multer from 'multer'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import { analyzePng } from './png-check.js'

dotenv.config()
const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } })
const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg'

// Diagnostic headers we send to the browser. None of them contain the API key.
const PIXORA_HEADERS = [
  'X-Pixora-Transparent-Percent', 'X-Pixora-Color-Type', 'X-Pixora-Width', 'X-Pixora-Height',
  'X-Pixora-Foreground-Type', 'X-Pixora-Credits-Charged'
]

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], exposedHeaders: PIXORA_HEADERS }))
app.get('/api/health', (_req, res) => res.json({ ok: true, removeBgConfigured: Boolean(process.env.REMOVE_BG_API_KEY) }))

// Safe, key-free summary of the remove.bg response for the server console.
function upstreamDiagnostics(upstream) {
  const h = upstream.headers
  return {
    status: upstream.status,
    contentType: h.get('content-type') || 'n/a',
    xType: h.get('x-type') || 'n/a',
    xCreditsCharged: h.get('x-credits-charged') || 'n/a',
    xCreditsRemaining: h.get('x-credits-remaining') || 'n/a',
    xRateLimitRemaining: h.get('x-ratelimit-remaining') || 'n/a',
    xWidth: h.get('x-width') || 'n/a',
    xHeight: h.get('x-height') || 'n/a'
  }
}

// Turn remove.bg's JSON error body into a readable message for the user.
function readableUpstreamError(status, rawBody) {
  let detail = ''
  try {
    const parsed = JSON.parse(rawBody)
    const first = parsed?.errors?.[0]
    if (first) detail = [first.title, first.detail].filter(Boolean).join(' — ')
    if (first?.code) detail += ` [${first.code}]`
  } catch {
    detail = rawBody.replace(/\s+/g, ' ').trim().slice(0, 300)
  }
  const hint = {
    400: 'The image could not be processed (for example, no clear foreground was found).',
    402: 'Your remove.bg account has no credits left.',
    403: 'remove.bg rejected the API key. Check REMOVE_BG_API_KEY in your .env file.',
    429: 'remove.bg rate limit reached. Wait a moment and try again.'
  }[status]
  return `remove.bg error ${status}: ${detail || 'No details returned.'}${hint ? ` ${hint}` : ''}`
}

app.post('/api/remove-background', upload.single('image'), async (req, res) => {
  try {
    if (!process.env.REMOVE_BG_API_KEY) return res.status(503).json({ error: 'Background removal is not configured yet. Add REMOVE_BG_API_KEY to your .env file.' })
    if (!req.file) return res.status(400).json({ error: 'Please upload an image.' })

    const size = req.body?.quality === 'full' ? 'auto' : 'preview'
    const form = new FormData()
    form.append('image_file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname)
    form.append('size', size)
    // Explicitly request an alpha-channel PNG.
    form.append('format', 'png')
    form.append('channels', 'rgba')

    const upstream = await fetch(REMOVE_BG_URL, {
      method: 'POST',
      headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY, Accept: 'image/png, application/json' },
      body: form
    })

    const diag = upstreamDiagnostics(upstream)
    console.log('[PIXORA] remove.bg response', { file: req.file.originalname, bytesIn: req.file.size, size, ...diag })

    if (!upstream.ok) {
      const body = await upstream.text()
      const message = readableUpstreamError(upstream.status, body)
      console.warn('[PIXORA] remove.bg error:', message)
      // 4xx from remove.bg are client/account problems; pass status through. 5xx -> 502.
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: message })
    }

    if (!diag.contentType.includes('image/png')) {
      const body = await upstream.text().catch(() => '')
      console.warn('[PIXORA] Unexpected content type from remove.bg:', diag.contentType)
      return res.status(502).json({ error: `remove.bg returned "${diag.contentType}" instead of a PNG. ${body.slice(0, 200)}` })
    }

    const bytes = Buffer.from(await upstream.arrayBuffer())
    const png = analyzePng(bytes)
    console.log('[PIXORA] PNG check', {
      bytes: bytes.length,
      isPng: png.isPng,
      colorType: png.colorTypeName,
      hasAlphaChannel: png.hasAlphaChannel,
      size: png.width ? `${png.width}x${png.height}` : 'n/a',
      transparentPixels: png.transparentPixels,
      partialPixels: png.partialPixels,
      transparentPercent: png.transparentRatio != null ? (png.transparentRatio * 100).toFixed(2) : 'n/a'
    })

    if (!png.isPng || !png.decodable) {
      return res.status(502).json({ error: `remove.bg did not return a valid PNG. ${png.reason || ''}`.trim() })
    }
    if (!png.hasAlphaChannel) {
      return res.status(502).json({ error: `remove.bg returned a PNG without an alpha channel (colour type: ${png.colorTypeName}). The background was not removed.` })
    }
    if (!png.isTransparentCutout) {
      return res.status(422).json({ error: `remove.bg returned a PNG with almost no transparent pixels (${(png.transparentRatio * 100).toFixed(2)}%). PIXORA could not find a background to remove in this image.` })
    }

    res.set('Content-Type', 'image/png')
    res.set('Content-Disposition', 'inline; filename="pixora-cutout.png"')
    res.set('Cache-Control', 'no-store')
    res.set('X-Pixora-Transparent-Percent', (png.transparentRatio * 100).toFixed(2))
    res.set('X-Pixora-Color-Type', png.colorTypeName)
    res.set('X-Pixora-Width', String(png.width))
    res.set('X-Pixora-Height', String(png.height))
    if (diag.xType !== 'n/a') res.set('X-Pixora-Foreground-Type', diag.xType)
    if (diag.xCreditsCharged !== 'n/a') res.set('X-Pixora-Credits-Charged', diag.xCreditsCharged)
    res.send(bytes)
  } catch (err) {
    // Log only the message, never request headers (they contain the API key).
    console.error('[PIXORA] remove-background failed:', err?.message || err)
    res.status(500).json({ error: 'Could not reach the background-removal service. Check your internet connection and try again.' })
  }
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(__dirname, '../dist')
app.use(express.static(dist))
app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
const port = process.env.PORT || 8787
app.listen(port, () => console.log(`PIXORA API ready at http://localhost:${port} (remove.bg key ${process.env.REMOVE_BG_API_KEY ? 'configured' : 'MISSING'})`))
