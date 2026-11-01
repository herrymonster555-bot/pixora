import { PNG } from 'pngjs'

const PNG_SIGNATURE = '89504e470d0a1a0a'

// PNG colour types that carry a real alpha channel.
const COLOR_TYPE_NAMES = { 0: 'grayscale', 2: 'rgb', 3: 'palette', 4: 'grayscale+alpha', 6: 'rgba' }

/**
 * Decode a PNG buffer and measure its real alpha data.
 * This inspects the actual pixel bytes. A checkerboard drawn by CSS, or a
 * checkerboard baked into the pixels, is NOT counted as transparency.
 */
export function analyzePng(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    return { isPng: false, reason: 'Response is not a PNG file (bad signature).' }
  }

  // IHDR is always the first chunk: width(4) height(4) bitDepth(1) colorType(1) ...
  const bitDepth = bytes[24]
  const colorType = bytes[25]
  const hasTrnsChunk = bytes.includes(Buffer.from('tRNS', 'ascii'))
  const hasAlphaChannel = colorType === 4 || colorType === 6 || hasTrnsChunk

  let decoded
  try {
    decoded = PNG.sync.read(bytes)
  } catch (err) {
    return { isPng: true, decodable: false, reason: `PNG could not be decoded: ${err.message}` }
  }

  // pngjs always expands to 8-bit RGBA, so every 4th byte is alpha.
  const { width, height, data } = decoded
  const total = width * height
  let transparent = 0 // alpha === 0
  let partial = 0 // 0 < alpha < 255 (soft edges, hair, etc.)
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i]
    if (a === 0) transparent++
    else if (a < 255) partial++
  }

  const transparentRatio = total ? transparent / total : 0
  return {
    isPng: true,
    decodable: true,
    width,
    height,
    bitDepth,
    colorType,
    colorTypeName: COLOR_TYPE_NAMES[colorType] || `unknown(${colorType})`,
    hasAlphaChannel,
    totalPixels: total,
    transparentPixels: transparent,
    partialPixels: partial,
    opaquePixels: total - transparent - partial,
    transparentRatio,
    // A real cutout must have an alpha channel AND a meaningful share of
    // fully transparent pixels (>= 0.5% of the image).
    isTransparentCutout: hasAlphaChannel && transparentRatio >= 0.005
  }
}
