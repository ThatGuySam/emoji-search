import type { EmbeddingRow } from "./types"

/**
 * Quantize normalized float32 vectors to
 * int8 with a per-vector scale and pack
 * into a compact binary format for web.
 *
 * Header (little-endian):
 * magic(4) 'EMBD' | version(1)=1 |
 * n(4) | dim(4) | dtype(1)=1(int8)
 * Payload:
 * Float32Array scales[n]
 * Int8Array   data[n*dim]
 */
export function packEmbeddingsBinary(
    embeds: EmbeddingRow[],
) {
    if (embeds.length === 0) {
      throw new Error('no embeddings')
    }
    const dim = embeds[0].embedding.length
    const n = embeds.length
    const scales = new Float32Array(n)
    const data = new Int8Array(n * dim)
    for (let i = 0; i < n; i++) {
      const vec = embeds[i].embedding
      if (vec.length !== dim) {
        throw new Error('dim mismatch')
      }
      let maxAbs = 0
      for (let d = 0; d < dim; d++) {
        const v = Math.abs(vec[d])
        if (v > maxAbs) maxAbs = v
      }
      const scale = maxAbs > 0
        ? maxAbs / 127
        : 1
      scales[i] = scale
      const base = i * dim
      for (let d = 0; d < dim; d++) {
        const q = Math.round(
          vec[d] / scale
        )
        data[base + d] = Math.max(
          -127, Math.min(127, q)
        )
      }
    }
    const headerFixedBytes = 4 + 1 + 4 + 4 + 1
    const pad = (4 - (headerFixedBytes % 4)) % 4
    const headerBytes = headerFixedBytes + pad
    const scalesBytes = n * 4
    const dataBytes = n * dim
    const total = headerBytes +
      scalesBytes + dataBytes
    const buf = new ArrayBuffer(total)
    const dv = new DataView(buf)
    let off = 0
    // 'EMBD'
    dv.setUint8(off++, 0x45)
    dv.setUint8(off++, 0x4d)
    dv.setUint8(off++, 0x42)
    dv.setUint8(off++, 0x44)
    dv.setUint8(off++, 1) // version
    dv.setUint32(off, n, true); off += 4
    dv.setUint32(off, dim, true); off += 4
    dv.setUint8(off++, 1) // dtype int8
    for (let i = 0; i < pad; i++) dv.setUint8(off++, 0)
    new Float32Array(buf, off, n)
      .set(scales)
    off += scalesBytes
    new Int8Array(buf, off, n * dim)
      .set(data)
    return Buffer.from(buf)
}

export type DecodedEmbeddings = {
  n: number
  dim: number
  scales: Float32Array
  data: Int8Array
}

/**
 * Decode a packed embeddings binary.
 * Accepts ArrayBuffer or Uint8Array.
 */
/**
 * Decode a packed buffer. If `meta` is
 * provided, also dequantizes to rows with
 * `content` copied from meta.
 *
 * Meta items may have `content` or `id`.
 */
export function decodeEmbeddingsBinary(
  input: ArrayBuffer | Uint8Array,
  meta?: Array<{ content?: string; id?: string }>,
): DecodedEmbeddings & { rows?: EmbeddingRow[] } {
  const isU8 = input instanceof Uint8Array
  const buffer = isU8 ? input.buffer : input
  const byteOffset = isU8 ? input.byteOffset : 0
  const byteLength = isU8 ? input.byteLength
    : (input as ArrayBuffer).byteLength
  const dv = new DataView(
    buffer, byteOffset, byteLength
  )
  let off = 0
  // magic 'EMBD'
  const m0 = dv.getUint8(off++)
  const m1 = dv.getUint8(off++)
  const m2 = dv.getUint8(off++)
  const m3 = dv.getUint8(off++)
  if (m0 !== 0x45 || m1 !== 0x4d ||
      m2 !== 0x42 || m3 !== 0x44) {
    throw new Error('bad magic')
  }
  const ver = dv.getUint8(off++)
  if (ver !== 1) throw new Error('bad ver')
  const n = dv.getUint32(off, true); off += 4
  const dim = dv.getUint32(off, true); off += 4
  const dtype = dv.getUint8(off++)
  if (dtype !== 1) throw new Error('bad dt')
  // align to 4 for Float32Array view
  const headerFixed = 4 + 1 + 4 + 4 + 1
  const pad = (4 - (headerFixed % 4)) % 4
  off += pad
  const scales = new Float32Array(
    buffer, byteOffset + off, n
  )
  off += n * 4
  const data = new Int8Array(
    buffer, byteOffset + off, n*dim
  )
  if (!meta) {
    return { n, dim, scales, data }
  }
  if (meta.length !== n) {
    throw new Error('meta length mismatch')
  }
  const rows: EmbeddingRow[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const base = i * dim
    const scale = scales[i] || 1
    const vec: number[] = new Array(dim)
    for (let d = 0; d < dim; d++) {
      vec[d] = data[base + d] * scale
    }
    const content = meta[i].content
      ?? meta[i].id
      ?? ''
    rows[i] = { content, embedding: vec }
  }
  return { n, dim, scales, data, rows }
}