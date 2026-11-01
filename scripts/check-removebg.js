// Calls the real remove.bg API once with your key from .env, prints the
// response status + headers (never the key), saves the PNG and reports
// whether it genuinely contains transparent pixels.
//
// Usage: npm run check:removebg -- path/to/photo.jpg
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { analyzePng } from '../server/png-check.js'

dotenv.config()
const input = process.argv[2]
if (!input) { console.error('Usage: npm run check:removebg -- path/to/photo.jpg'); process.exit(1) }
if (!process.env.REMOVE_BG_API_KEY) { console.error('REMOVE_BG_API_KEY is missing from .env'); process.exit(1) }

const buf = await fs.readFile(input)
const form = new FormData()
form.append('image_file', new Blob([buf]), path.basename(input))
form.append('size', 'preview')
form.append('format', 'png')
form.append('channels', 'rgba')

const res = await fetch('https://api.remove.bg/v1.0/removebg', {
  method: 'POST', headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY }, body: form
})
const h = res.headers
console.log('Status            :', res.status)
console.log('Content-Type      :', h.get('content-type'))
console.log('X-Type            :', h.get('x-type') || 'n/a')
console.log('X-Credits-Charged :', h.get('x-credits-charged') || 'n/a')
console.log('X-Credits-Remaining:', h.get('x-credits-remaining') || 'n/a')

if (!res.ok) { console.log('Error body        :', (await res.text()).slice(0, 500)); process.exit(1) }

const bytes = Buffer.from(await res.arrayBuffer())
const out = path.resolve('removebg-check-output.png')
await fs.writeFile(out, bytes)
const r = analyzePng(bytes)
console.log('Saved             :', out)
console.log('PNG colour type   :', r.colorTypeName, '| alpha channel:', r.hasAlphaChannel)
console.log('Size              :', `${r.width}x${r.height}`)
console.log('Transparent pixels:', r.transparentPixels, `(${(r.transparentRatio * 100).toFixed(2)}%)`, '| soft-edge pixels:', r.partialPixels)
console.log(r.isTransparentCutout ? 'RESULT: genuine transparent cutout ✔' : 'RESULT: NOT a transparent cutout ✘')
process.exit(r.isTransparentCutout ? 0 : 2)
