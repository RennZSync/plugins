import crypto from 'crypto'
import https from 'https'
import {
  spawn
} from 'child_process'
import JSZip from 'jszip'
import ffmpeg from 'fluent-ffmpeg'
import {
  promises as fsp
} from 'fs'
import os from 'os'
import path from 'path'
import {
  proto,
  downloadContentFromMessage
} from 'baileys'
import store from '../../lib/store/store.js'
import {
  writeExif
} from '../../lib/core/exif.js'

const MAX_STICKER_BYTES = 1024 * 1024
const STICKER_VIDEO_MAX_SECONDS = 10
const BASE_WIDTH = 512
const MIN_WIDTH = 240
const RESOLUTION_STEP = 64
const ALBUM_ASSOCIATION_TYPE = 1

const AUTO_CROP_MIN_RATIO = 0.75
const AUTO_CROP_MAX_RATIO = 1.34
const MIN_BORDER_RATIO = 0.04
const MIN_CONTENT_AREA = 0.3
function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value
  if (value && value.type === 'Buffer' && Array.isArray(value.data)) return Buffer.from(value.data)
  if (typeof value === 'string') return Buffer.from(value, 'base64')
  throw new Error('Format buffer tidak dikenali')
}

function toStoredBuffer(buffer) {
  return Buffer.from(buffer).toString('base64')
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest()
}

function toB64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function makeTrayWebp(buffer) {
  const sharpMod = await import('sharp').catch(() => null)
  if (!sharpMod?.default) throw new Error('Install sharp dulu:\nnpm i sharp')

  return await sharpMod.default(buffer, {
      animated: false
    })
    .resize(252, 252, {
      fit: 'cover'
    })
    .webp()
    .toBuffer()
}

async function makeBlankTrayWebp() {
  const sharpMod = await import('sharp').catch(() => null)
  if (!sharpMod?.default) throw new Error('Install sharp dulu:\nnpm i sharp')

  return await sharpMod.default({
      create: {
        width: 252,
        height: 252,
        channels: 4,
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0
        },
      },
    })
    .webp()
    .toBuffer()
}

async function makeThumbnailJpeg(buffer) {
  const sharpMod = await import('sharp').catch(() => null)
  if (!sharpMod?.default) throw new Error('Install sharp dulu:\nnpm i sharp')

  return await sharpMod.default(buffer)
    .resize(252, 252, {
      fit: 'cover'
    })
    .jpeg()
    .toBuffer()
}

async function uploadToServer(conn, buffer, {
  hkdf,
  mediaPath,
  mediaKey = crypto.randomBytes(32)
}) {
  const expanded = Buffer.from(
    crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(32), Buffer.from(hkdf), 112),
  )

  const iv = expanded.subarray(0, 16)
  const cipherKey = expanded.subarray(16, 48)
  const macKey = expanded.subarray(48, 80)

  const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv)
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])

  const mac = crypto
    .createHmac('sha256', macKey)
    .update(iv)
    .update(encrypted)
    .digest()
    .subarray(0, 10)

  const encBuffer = Buffer.concat([encrypted, mac])

  const fileSha256 = sha256(buffer)
  const fileEncSha256 = sha256(encBuffer)

  const iq = await conn.query({
    tag: 'iq',
    attrs: {
      id: conn.generateMessageTag?.() ?? Date.now().toString(),
      to: 's.whatsapp.net',
      type: 'set',
      xmlns: 'w:m',
    },
    content: [{
      tag: 'media_conn',
      attrs: {}
    }],
  })

  const mediaConn = iq.content?.find(v => v.tag === 'media_conn')
  if (!mediaConn) throw new Error('media_conn tidak ditemukan')

  const auth = mediaConn.attrs?.auth
  if (!auth) throw new Error('auth media_conn tidak ditemukan')

  const hosts = (mediaConn.content || [])
    .filter(v => v.tag === 'host')
    .map(v => v.attrs?.hostname)
    .filter(Boolean)

  if (!hosts.length) throw new Error('host upload tidak ditemukan')

  const token = encodeURIComponent(
    fileEncSha256.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
  )

  let lastError

  for (const host of hosts) {
    try {
      const json = await new Promise((resolve, reject) => {
        const url = new URL(
          `https://${host}${mediaPath}/${token}?auth=${encodeURIComponent(auth)}&token=${token}`,
        )

        const req = https.request({
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
              Origin: 'https://web.whatsapp.com',
              Referer: 'https://web.whatsapp.com/',
              'Content-Type': 'application/octet-stream',
              'Content-Length': encBuffer.length,
            },
          },
          (res) => {
            let body = ''

            res.on('data', c => body += c)

            res.on('end', () => {
              if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`Upload gagal ${res.statusCode}: ${body}`))
              }

              try {
                resolve(JSON.parse(body))
              } catch {
                reject(new Error(`Response bukan JSON: ${body}`))
              }
            })
          },
        )

        req.on('error', reject)
        req.write(encBuffer)
        req.end()
      })

      const directPath = json.direct_path ?? json.directPath ?? json.url ?? json.path
      if (!directPath) throw new Error('directPath tidak ditemukan')

      return {
        mediaKey,
        fileLength: buffer.length,
        fileSha256,
        fileEncSha256,
        directPath,
        ...json,
      }
    } catch (e) {
      lastError = e
    }
  }

  throw lastError ?? new Error('Semua host upload gagal')
}

async function sendCustomStickerPack(conn, m, pack, packName = '𝐋𝐘𝐍𝐍𝐀 𝐀𝐈',
  packDescription = 'Stiker pack ini di buat menggunakan lynna MD', publisher) {
  const zip = new JSZip()
  const stickersMetadata = []
  const hydrated = pack.map(item => ({
    ...item,
    buffer: toBuffer(item.buffer)
  }))

  for (const item of hydrated) {
    const fileName = `${toB64Url(sha256(item.buffer))}.${item.ext}`

    zip.file(fileName, item.buffer)

    stickersMetadata.push({
      fileName,
      isAnimated: item.isAnimated,
      emojis: [''],
      accessibilityLabel: '',
      isLottie: item.isLottie,
      mimetype: item.mimetype,
    })
  }

  const trayIconFileName = 'tray_icon.webp'
  const traySource = hydrated.find(v => !v.isLottie)?.buffer

  const trayBuffer = traySource ?
    await makeTrayWebp(traySource) :
    await makeBlankTrayWebp()

  zip.file(trayIconFileName, trayBuffer)

  const archive = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'STORE'
  })

  const packUpload = await uploadToServer(conn, archive, {
    hkdf: 'WhatsApp Sticker Pack Keys',
    mediaPath: '/mms/sticker-pack',
  })

  const thumbnailBuffer = await makeThumbnailJpeg(trayBuffer)

  const thumbUpload = await uploadToServer(conn, thumbnailBuffer, {
    hkdf: 'WhatsApp Sticker Pack Thumbnail Keys',
    mediaPath: '/mms/thumbnail-sticker-pack',
    mediaKey: packUpload.mediaKey,
  })

  await conn.relayMessage(
    m.chat, {
      messageContextInfo: {
        messageSecret: crypto.randomBytes(32),
      },
      stickerPackMessage: {
        stickerPackId: 'Pack_' + crypto.randomBytes(8).toString('hex'),
        name: packName,
        publisher: publisher || m.pushName || 'Unknown',
        packDescription,

        stickers: stickersMetadata,

        fileLength: packUpload.fileLength,
        fileSha256: packUpload.fileSha256,
        fileEncSha256: packUpload.fileEncSha256,
        mediaKey: packUpload.mediaKey,
        directPath: packUpload.directPath,
        mediaKeyTimestamp: Math.floor(Date.now() / 1000),
        stickerPackSize: packUpload.fileLength,
        stickerPackOrigin: 2,

        trayIconFileName,
        thumbnailDirectPath: thumbUpload.directPath,
        thumbnailSha256: thumbUpload.fileSha256,
        thumbnailEncSha256: thumbUpload.fileEncSha256,
        thumbnailHeight: 252,
        thumbnailWidth: 252,
        imageDataHash: thumbUpload.fileSha256.toString('base64'),
      },
    }, {
      quoted: m,
    },
  )
}

function normalizeMessage(rmsg) {
  return proto.WebMessageInfo.toObject(
    proto.WebMessageInfo.fromObject(rmsg), {
      enums: Number,
      longs: Number,
      bytes: String,
      defaults: false,
    },
  )
}

function unwrapAssociatedChild(msg) {
  const contextInfo = msg.message.messageContextInfo
  const inner = msg.message.associatedChildMessage?.message
  if (!inner) return msg

  return {
    ...msg,
    message: {
      ...inner,
      messageContextInfo: contextInfo,
    },
  }
}

function resolveAlbumParentId(storeRef, chat, quotedId) {
  const row = storeRef.db.prepare(`
        SELECT data
        FROM messages
        WHERE id = ?
        AND chat = ?
        LIMIT 1
    `).get(quotedId, chat)

  if (!row) return quotedId

  let decoded
  try {
    decoded = proto.WebMessageInfo.decode(row.data).toJSON()
  } catch {
    return quotedId
  }

  let normalized
  try {
    normalized = normalizeMessage(decoded)
  } catch {
    return quotedId
  }

  const assoc = normalized?.message?.messageContextInfo?.messageAssociation
  const parentId = assoc?.parentMessageKey?.id

  return parentId || quotedId
}

function findAlbumChildren(storeRef, chat, quotedId, radius = 50) {
  const parentId = resolveAlbumParentId(storeRef, chat, quotedId)

  const base = storeRef.db.prepare(`
        SELECT timestamp
        FROM messages
        WHERE id = ?
        AND chat = ?
        LIMIT 1
    `).get(parentId, chat)

  let anchorTimestamp = base?.timestamp
  if (!anchorTimestamp) {
    const quotedRow = storeRef.db.prepare(`
            SELECT timestamp FROM messages WHERE id = ? AND chat = ? LIMIT 1
        `).get(quotedId, chat)
    anchorTimestamp = quotedRow?.timestamp
  }
  if (!anchorTimestamp) return []

  const older = storeRef.db.prepare(`
        SELECT id, data
        FROM messages
        WHERE chat = ?
        AND timestamp <= ?
        ORDER BY timestamp DESC
        LIMIT ?
    `).all(chat, anchorTimestamp, radius)

  const newer = storeRef.db.prepare(`
        SELECT id, data
        FROM messages
        WHERE chat = ?
        AND timestamp > ?
        ORDER BY timestamp ASC
        LIMIT ?
    `).all(chat, anchorTimestamp, radius)

  const children = []

  for (const row of [...older, ...newer]) {
    if (row.id === parentId) continue

    let decoded
    try {
      decoded = proto.WebMessageInfo.decode(row.data).toJSON()
    } catch {
      continue
    }

    let normalized
    try {
      normalized = normalizeMessage(decoded)
    } catch {
      continue
    }

    const assoc = normalized?.message?.messageContextInfo?.messageAssociation
    if (!assoc?.parentMessageKey) continue
    if (assoc.parentMessageKey.id !== parentId) continue
    if (assoc.parentMessageKey.remoteJid && assoc.parentMessageKey.remoteJid !== chat) continue
    if (assoc.associationType !== ALBUM_ASSOCIATION_TYPE) continue

    children.push(normalized)
  }

  return children
}

async function waitForAlbumChildren(storeRef, chat, anchorId, {
  expectedCount = null,
  timeoutMs = 4000,
  intervalMs = 350
} = {}) {
  const start = Date.now()
  let children = []
  while (Date.now() - start < timeoutMs) {
    children = findAlbumChildren(storeRef, chat, anchorId)
    if (children.length && (!expectedCount || children.length >= expectedCount)) break
    await new Promise(r => setTimeout(r, intervalMs))
  }
  return children
}

function hydrateMediaBuffers(media) {
  const fields = ['mediaKey', 'fileEncSha256', 'fileSha256']
  const clone = {
    ...media
  }

  for (const f of fields) {
    if (typeof clone[f] === 'string') {
      clone[f] = Buffer.from(clone[f], 'base64')
    }
  }

  return clone
}

async function downloadAlbumMedia(mediaMessage, type) {
  const hydrated = hydrateMediaBuffers(mediaMessage)
  const stream = await downloadContentFromMessage(hydrated, type)

  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)

  return Buffer.concat(chunks)
}

function ffprobeInfo(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return reject(err)

      const v = data?.streams?.find(s => s.codec_type === 'video')
      let width = Number(v?.width) || 0
      let height = Number(v?.height) || 0

      const rotation = Math.abs(Number(
        v?.tags?.rotate ?? v?.side_data_list?.find(s => s.rotation !== undefined)?.rotation ?? 0,
      )) % 180
      if (rotation === 90)[width, height] = [height, width]

      resolve({
        duration: Number(data?.format?.duration) || 0,
        width,
        height
      })
    })
  })
}

function detectContentBox(inputPath, duration) {
  return new Promise(resolve => {
    let err = ''

    const p = spawn('ffmpeg', [
      '-hide_banner', '-nostats',
      '-t', String(duration),
      '-i', inputPath,
      '-an',
      '-vf', 'fps=4,cropdetect=limit=24:round=2:reset=0',
      '-f', 'null', '-',
    ])

    const timer = setTimeout(() => p.kill('SIGKILL'), 20000)
    const done = value => {
      clearTimeout(timer)
      resolve(value)
    }

    p.stderr.on('data', d => err += d)
    p.on('error', () => done(null))
    p.on('close', () => {
      const boxes = [...err.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)]
        .map(v => ({
          w: +v[1],
          h: +v[2],
          x: +v[3],
          y: +v[4]
        }))
        .filter(b => b.w > 0 && b.h > 0)

      done(boxes.at(-1) || null)
    })
  })
}

async function detectVideoLayout(inputPath, info, duration) {
  try {
    const {
      width: fw,
      height: fh
    } = info
    const box = await detectContentBox(inputPath, duration)

    let crop = null
    if (box && fw && fh) {
      const noBorder = box.w >= fw * (1 - MIN_BORDER_RATIO) && box.h >= fh * (1 - MIN_BORDER_RATIO)
      const tooSmall = box.w * box.h < fw * fh * MIN_CONTENT_AREA
      if (!noBorder && !tooSmall) crop = box
    }

    const w = crop ? crop.w : fw
    const h = crop ? crop.h : fh
    const ratio = w && h ? w / h : 1
    const mode = ratio >= AUTO_CROP_MIN_RATIO && ratio <= AUTO_CROP_MAX_RATIO ? 'crop' : 'fit'

    return {
      crop,
      mode
    }
  } catch {
    return {
      crop: null,
      mode: 'fit'
    }
  }
}

function parseModeFlag(text) {
  let mode = 'auto'
  let rest = (text || '').trim()

  const flag = rest.match(/^-(crop|fit|auto)\b\s*/i)
  if (flag) {
    mode = flag[1].toLowerCase()
    rest = rest.slice(flag[0].length)
  }

  return {
    mode,
    text: rest
  }
}

function encodeAnimatedWebp(inputPath, outputPath, {
  width,
  duration,
  mode,
  crop
}) {
  const trim = crop ? [`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`] : []

  const filters = mode === 'crop' ?
    [
      ...trim,
      'fps=15',
      'crop=min(iw\\,ih):min(iw\\,ih)',
      `scale=${width}:${width}:flags=lanczos`,
    ] :
    [
      ...trim,
      'fps=15',
      `scale=${width}:${width}:force_original_aspect_ratio=decrease:flags=lanczos`,
      `pad=${width}:${width}:(ow-iw)/2:(oh-ih)/2:color=black@0.0`,
    ]

  const outputOptions = ['-loop', '0', '-preset', 'default', '-an', '-vsync', '0', '-vcodec', 'libwebp']
  if (mode !== 'crop') outputOptions.push('-pix_fmt', 'yuva420p')

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(['-t', String(duration)])
      .videoFilters(filters)
      .outputOptions(outputOptions)
      .save(outputPath)
      .on('end', resolve)
      .on('error', reject)
  })
}

async function videoToStickerWebp(buffer, mode = 'auto') {
  const tmpDir = os.tmpdir()
  const uid = crypto.randomBytes(6).toString('hex')
  const inputPath = path.join(tmpDir, `spack-in-${uid}.mp4`)

  await fsp.writeFile(inputPath, buffer)

  try {
    const info = await ffprobeInfo(inputPath)

    let duration = Math.min(info.duration || STICKER_VIDEO_MAX_SECONDS, STICKER_VIDEO_MAX_SECONDS)
    let width = BASE_WIDTH
    let result

    let crop = null
    if (mode === 'auto') {
      ;
      ({
        crop,
        mode
      } = await detectVideoLayout(inputPath, info, duration))
    }

    for (let i = 0; i < 30; i++) {
      const outputPath = path.join(tmpDir, `spack-out-${uid}-${i}.webp`)

      await encodeAnimatedWebp(inputPath, outputPath, {
        width,
        duration,
        mode,
        crop
      })

      const out = await fsp.readFile(outputPath)
      await fsp.unlink(outputPath).catch(() => {})

      result = out

      if (out.length <= MAX_STICKER_BYTES) break
      if (width <= MIN_WIDTH && duration <= 1) break

      if (width > MIN_WIDTH) {
        width = Math.max(MIN_WIDTH, width - RESOLUTION_STEP)
      } else {
        width = BASE_WIDTH
        duration = Math.max(1, duration - 1)
      }
    }

    return result
  } finally {
    await fsp.unlink(inputPath).catch(() => {})
  }
}

async function imageToStickerWebp(buffer, mode) {
  const sharpMod = await import('sharp').catch(() => null)
  if (!sharpMod?.default) throw new Error('Install sharp dulu:\nnpm i sharp')

  const resizeOptions = mode === 'crop' ?
    {
      fit: 'cover',
      position: 'centre'
    } :
    {
      fit: 'contain',
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    }

  let width = BASE_WIDTH
  let result

  for (let i = 0; i < 20; i++) {
    const out = await sharpMod.default(buffer)
      .resize(width, width, resizeOptions)
      .webp({
        quality: 80
      })
      .toBuffer()

    result = out

    if (out.length <= MAX_STICKER_BYTES) break
    if (width <= MIN_WIDTH) break

    width = Math.max(MIN_WIDTH, width - RESOLUTION_STEP)
  }

  return result
}

async function convertAlbumChild(mediaType, buffer, mode) {
  if (mediaType === 'imageMessage') {
    const webp = await imageToStickerWebp(buffer, mode)
    return {
      buffer: webp,
      ext: 'webp',
      mimetype: 'image/webp',
      isAnimated: false,
      isLottie: false
    }
  }

  if (mediaType === 'videoMessage') {
    const webp = await videoToStickerWebp(buffer, mode)
    return {
      buffer: webp,
      ext: 'webp',
      mimetype: 'image/webp',
      isAnimated: true,
      isLottie: false
    }
  }

  return null
}

async function processAlbumToPack(conn, m, children, {
  mode,
  packName,
  packDescription,
  publisher
}) {
  await m.reply(`Ditemukan ${children.length} media, lagi diproses jadi sticker pack...`)

  const packItems = []
  const errors = []

  for (const child of children) {
    const unwrapped = unwrapAssociatedChild(child)

    const mediaType = Object.keys(unwrapped.message)
      .find(v => v === 'imageMessage' || v === 'videoMessage')

    if (!mediaType) continue

    try {
      const rawBuffer = await downloadAlbumMedia(
        unwrapped.message[mediaType],
        mediaType === 'imageMessage' ? 'image' : 'video',
      )

      const converted = await convertAlbumChild(mediaType, rawBuffer, mode)
      if (!converted) continue

      const withExif = await writeExif({
        mimetype: 'image/webp',
        data: converted.buffer
      }, {
        packName: packName || '',
        packPublish: publisher || ''
      }, )

      packItems.push({
        sha256: sha256(withExif).toString('hex'),
        buffer: toStoredBuffer(withExif),
        ext: converted.ext,
        mimetype: converted.mimetype,
        isAnimated: converted.isAnimated,
        isLottie: converted.isLottie,
      })
    } catch (e) {
      console.error('[spack] gagal proses 1 item:', e)
      errors.push(e?.message || String(e))
    }
  }

  if (!packItems.length) {
    const reason = errors[0] ? `\n\nError: ${errors[0]}` : ''
    return m.reply(`Gagal proses semua media di album ini.${reason}`)
  }

  return sendCustomStickerPack(conn, m, packItems, packName, packDescription, publisher)
}

function detectMedia(q) {
  const direct = q?.mimetype || q?.msg?.mimetype
  if (direct) return {
    mime: direct,
    seconds: q?.seconds ?? q?.msg?.seconds ?? 0
  }

  const message = q?.message || q?.msg?.message
  if (message) {
    for (const t of ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage']) {
      if (message[t]?.mimetype) {
        return {
          mime: message[t].mimetype,
          seconds: message[t].seconds || 0
        }
      }
    }
  }

  return {
    mime: '',
    seconds: 0
  }
}


const AUDIO_STICKER_CMD = /^(audiosticker|stickeraudio|stikeraudio|stikaudio)$/i
const AUDIO_STICKER_BODY_CMD = /^\S?(audiosticker|stickeraudio|stikeraudio|stikaudio)\b/i
const AUDIO_STICKER_IMAGE = './media/menu.jpg'
const AUDIO_SESSION_SECONDS = 60
const MEDIA_KEY_DOMAIN_E2EE = 1
const AUDIO_STICKER_EXPERIENCE_ID = 13001

const MEDIA_HKDF = {
  audio: 'WhatsApp Audio Keys',
  sticker: 'WhatsApp Image Keys',
}

if (!globalThis.__audioStickerSessions) globalThis.__audioStickerSessions = new Map()
const audioSessions = globalThis.__audioStickerSessions

function runFFmpeg(args, input) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args)
    const out = []
    let err = ''

    p.stdout.on('data', d => out.push(d))
    p.stderr.on('data', d => err += d)
    p.on('error', reject)
    p.on('close', code => {
      if (code !== 0) {
        const e = new Error(err.slice(-500))
        e.stderr = err
        return reject(e)
      }
      resolve(Buffer.concat(out))
    })

    p.stdin.on('error', () => {})
    p.stdin.end(input)
  })
}

async function audioToOpus(input) {
  const tmp = path.join(os.tmpdir(), `as-in-${crypto.randomBytes(8).toString('hex')}.bin`)
  await fsp.writeFile(tmp, input)

  const encode = af => runFFmpeg([
    '-nostdin',
    '-v', 'error',
    '-i', tmp,
    '-vn',
    '-map', '0:a:0',
    ...(af ? ['-af', af] : []),
    '-map_metadata', '-1',
    '-c:a', 'libopus',
    '-b:a', '64k',
    '-ar', '48000',
    ...(af ? [] : ['-ac', '1']),
    '-f', 'ogg',
    'pipe:1',
  ])

  try {
    try {
      return {
        buf: await encode(),
        mimetype: 'audio/ogg; codecs=opus'
      }
    } catch (e) {
      const log = e?.stderr || e?.message || ''

      if (!/channel layout/i.test(log)) throw e

      const n = Math.min(32, Math.max(1, Number(log.match(/(\d+) channels/)?.[1]) || 2))
      const mix = Array.from({
        length: n
      }, (_, i) => `${(1 / n).toFixed(4)}*c${i}`).join('+')

      return {
        buf: await encode(`pan=mono|c0=${mix}`),
        mimetype: 'audio/ogg; codecs=opus'
      }
    }
  } catch (e) {
    if (/matches no streams|does not contain any stream/i.test(e?.message || '')) e.noAudio = true
    throw e
  } finally {
    fsp.unlink(tmp).catch(() => {})
  }
}

function imageToSquareWebp(input) {
  return runFFmpeg([
    '-v', 'error',
    '-i', 'pipe:0',
    '-frames:v', '1',
    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2',
    '-c:v', 'libwebp',
    '-f', 'webp',
    'pipe:1',
  ], input)
}

function parseWebpInfo(b) {
  if (
    b.length < 30 ||
    b.toString('ascii', 0, 4) !== 'RIFF' ||
    b.toString('ascii', 8, 12) !== 'WEBP'
  ) throw new Error('WebP tidak valid')

  const c = b.toString('ascii', 12, 16)

  if (c === 'VP8 ')
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
      isAnimated: false,
    }

  if (c === 'VP8L')
    return {
      width: 1 + (b[21] | ((b[22] & 0x3f) << 8)),
      height: 1 + ((b[22] >> 6) | (b[23] << 2) | ((b[24] & 0x0f) << 10)),
      isAnimated: false,
    }

  if (c === 'VP8X')
    return {
      width: 1 + b.readUIntLE(24, 3),
      height: 1 + b.readUIntLE(27, 3),
      isAnimated: (b[20] & 2) !== 0,
    }

  throw new Error('Chunk WebP tidak didukung')
}

function oggOpusSeconds(buf) {
  const i = buf.lastIndexOf('OggS')
  if (i < 0 || i + 14 > buf.length) return 0

  const granule = buf.readBigUInt64LE(i + 6)
  if (granule === 0xffffffffffffffffn) return 0

  return Number(granule) / 48000
}

function makeWaveform(buf, length = 64) {
  const wf = Buffer.alloc(length)

  for (let i = 0; i < length; i++) {
    const b = buf.length ? buf[(i * 19 + 7) % buf.length] : i * 11
    wf[i] = 18 + (b % 76)
  }

  return wf
}

function audioStickerMediaInfo(node) {
  if (!node) return {
    kind: null,
    mime: '',
    seconds: 0
  }

  const {
    mime,
    seconds
  } = detectMedia(node)
  const mtype = String(node.mtype || node.type || '')
  const mt = String(mime || '').toLowerCase()

  let kind = null
  if (/^video\//.test(mt) || /videoMessage/i.test(mtype)) kind = 'video'
  else if (/webp/.test(mt) || /stickerMessage/i.test(mtype)) kind = 'webp'
  else if (/^image\//.test(mt) || /imageMessage/i.test(mtype)) kind = 'image'
  else if (/^audio\//.test(mt) || /audioMessage/i.test(mtype)) kind = 'audio'

  return {
    kind,
    mime: mt,
    seconds: Number(seconds) || 0
  }
}

const isVisualKind = info => info.kind === 'video' || info.kind === 'image' || info.kind === 'webp'

const audioSessionKey = m => `${m.chat}:${m.sender}`

function clearAudioSession(key) {
  const s = audioSessions.get(key)
  if (s?.timer) clearTimeout(s.timer)
  audioSessions.delete(key)
}

const audioReact = (conn, m, emoji) =>
  conn?.sendMessage?.(m.chat, {
    react: {
      text: emoji,
      key: m.key
    }
  })?.catch?.(() => {})

async function prepareAudio(raw, fallbackSeconds = 0) {
  const input = Buffer.from(raw)

  const opus = input.subarray(0, 4).toString('ascii') === 'OggS' ?
    {
      buf: input,
      mimetype: 'audio/ogg; codecs=opus'
    } :
    await audioToOpus(input)

  const seconds = Math.max(1, Math.round(oggOpusSeconds(opus.buf) || fallbackSeconds || 1))

  return {
    ...opus,
    seconds,
    waveform: makeWaveform(opus.buf)
  }
}

async function addPackExif(webp, packName, publisher) {
  const out = await writeExif({
    mimetype: 'image/webp',
    data: webp
  }, {
    packName,
    packPublish: publisher
  }, )

  return out || webp
}

async function buildStickerBuffer(raw, info, {
  mode,
  packName,
  publisher
}) {
  const input = Buffer.from(raw)

  let webp
  if (info.kind === 'video') webp = await videoToStickerWebp(input, mode)
  else if (info.kind === 'image') webp = await imageToStickerWebp(input, mode)
  else webp = input

  return addPackExif(webp, packName, publisher)
}

async function buildDefaultStickerBuffer({
  packName,
  publisher
}) {
  const webp = await imageToSquareWebp(await fsp.readFile(AUDIO_STICKER_IMAGE))
  return addPackExif(webp, packName, publisher)
}


async function uploadAudioStickerMedia(conn, plain, kind) {
  const mediaKey = crypto.randomBytes(32)
  const k = Buffer.from(
    crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(32), MEDIA_HKDF[kind], 112),
  )

  const iv = k.subarray(0, 16)
  const cipher = crypto.createCipheriv('aes-256-cbc', k.subarray(16, 48), iv)
  const enc = Buffer.concat([cipher.update(plain), cipher.final()])

  const mac = crypto
    .createHmac('sha256', k.subarray(48, 80))
    .update(iv)
    .update(enc)
    .digest()
    .subarray(0, 10)

  const file = Buffer.concat([enc, mac])
  const fileEncSha256 = sha256(file)
  const tmp = path.join(os.tmpdir(), `as-${kind}-${crypto.randomBytes(8).toString('hex')}.enc`)

  await fsp.writeFile(tmp, file)

  try {
    const res = await conn.waUploadToServer(tmp, {
      fileEncSha256B64: fileEncSha256.toString('base64'),
      mediaType: kind,
    })

    if (!res?.directPath)
      throw new Error(`upload ${kind} tidak mengembalikan directPath`)

    return {
      url: res.mediaUrl || `https://mmg.whatsapp.net${res.directPath}`,
      directPath: res.directPath,
      mediaKey,
      fileEncSha256,
      fileSha256: sha256(plain),
      fileLength: plain.length,
      mediaKeyTimestamp: Math.floor(Date.now() / 1000),
    }
  } finally {
    fsp.unlink(tmp).catch(() => {})
  }
}

const mediaDomainInfo = mediaKey => ({
  mediaKeyDomain: MEDIA_KEY_DOMAIN_E2EE,
  e2EeMediaKey: mediaKey,
})


function buildAudioStickerMessage(a, s, audio, webp) {
  return {
    messageContextInfo: {
      messageSecret: crypto.randomBytes(32),
    },
    audioStickerMessage: {
      message: {
        stickerMessage: {
          url: s.url,
          fileSha256: s.fileSha256,
          fileEncSha256: s.fileEncSha256,
          mediaKey: s.mediaKey,
          mimetype: 'image/webp',
          height: webp.height,
          width: webp.width,
          directPath: s.directPath,
          fileLength: s.fileLength,
          mediaKeyTimestamp: s.mediaKeyTimestamp,
          isAnimated: webp.isAnimated,
          stickerSentTs: Date.now(),
          contextInfo: {
            mediaDomainInfo: mediaDomainInfo(s.mediaKey),
            experienceIds: [AUDIO_STICKER_EXPERIENCE_ID],
          },
          audioMessage: {
            url: a.url,
            mimetype: audio.mimetype,
            fileSha256: a.fileSha256,
            fileEncSha256: a.fileEncSha256,
            fileLength: a.fileLength,
            seconds: audio.seconds,
            ptt: true,
            mediaKey: a.mediaKey,
            directPath: a.directPath,
            mediaKeyTimestamp: a.mediaKeyTimestamp,
            waveform: audio.waveform,
            contextInfo: {
              mediaDomainInfo: mediaDomainInfo(a.mediaKey),
            },
          },
        },
      },
    },
  }
}

async function sendAudioSticker(conn, chat, stickerBuf, audio) {
  const webp = parseWebpInfo(stickerBuf)

  const [a, s] = await Promise.all([
    uploadAudioStickerMedia(conn, audio.buf, 'audio'),
    uploadAudioStickerMedia(conn, stickerBuf, 'sticker'),
  ])

  await conn.relayMessage(chat, buildAudioStickerMessage(a, s, audio, webp), {})
}


function startAudioSession(conn, m, {
  stickerBuf,
  packName,
  publisher,
  usedPrefix,
  command
}) {
  const key = audioSessionKey(m)
  clearAudioSession(key)

  const timer = setTimeout(() => {
    if (audioSessions.get(key)?.timer !== timer) return
    audioSessions.delete(key)

    conn?.sendMessage?.(m.chat, {
      text: `⏰ *SESI AUDIO STICKER BERAKHIR*\n> _Waktu ${AUDIO_SESSION_SECONDS} detik habis. Kirim ulang fotonya kalau mau bikin lagi._`,
    }, {
      quoted: m
    })?.catch?.(() => {})
  }, AUDIO_SESSION_SECONDS * 1000)

  audioSessions.set(key, {
    stickerBuf,
    expiresAt: Date.now() + AUDIO_SESSION_SECONDS * 1000,
    processing: false,
    timer,
  })

  const animated = parseWebpInfo(stickerBuf).isAnimated

  return m.reply(
    `✦ *SESI AUDIO STICKER AKTIF* ✦\n` +
    `> _Stiker disimpan sementara, tinggal kirim suaranya._\n\n` +
    `╭─「 *DETAIL* 」\n` +
    `│ ◦ *Pack* : *${packName}*\n` +
    `│ ◦ *Author* : *${publisher}*\n` +
    `│ ◦ *Tipe* : \`${animated ? 'Animated' : 'Static'}\`\n` +
    `│ ◦ *Waktu* : \`${AUDIO_SESSION_SECONDS} detik\`\n` +
    `│ ◦ *Durasi audio* : \`bebas\`\n` +
    `╰───────────────\n\n` +
    `╭─「 *LANGKAH SELANJUTNYA* 」\n` +
    `│ 1. Kirim *audio / VN* ke chat ini\n` +
    `│ 2. Atau reply audio dengan \`${usedPrefix}${command}\`\n` +
    `│ 3. \`${usedPrefix}${command} batal\` untuk membatalkan\n` +
    `╰───────────────`,
  )
}

async function consumeAudioSession(conn, m, session, audioNode, audioInfo) {
  const key = audioSessionKey(m)
  session.processing = true
  audioReact(conn, m, '⏳')

  try {
    const raw = await audioNode.download()
    if (!raw?.length) throw new Error('Gagal mengunduh audio.')

    const audio = await prepareAudio(raw, audioInfo.seconds)
    await sendAudioSticker(conn, m.chat, session.stickerBuf, audio)

    clearAudioSession(key)
    audioReact(conn, m, '✅')
  } catch (e) {
    session.processing = false
    console.error('[audiosticker] sesi gagal:', e)
    audioReact(conn, m, '❌')
    return m.reply(`Gagal menggabungkan suara ke stiker.\n\n${e?.message || e}`)
  }
}

async function audioStickerBefore(m, extra = {}) {
  if (!m || m.fromMe || !audioSessions.size) return false

  const key = audioSessionKey(m)
  const session = audioSessions.get(key)
  if (!session || session.processing) return false

  if (Date.now() > session.expiresAt) {
    clearAudioSession(key)
    return false
  }

  const body = String(m.text || m.body || '').trim()
  if (AUDIO_STICKER_BODY_CMD.test(body)) return false

  const own = audioStickerMediaInfo(m)
  const quoted = audioStickerMediaInfo(m.quoted)

  const direct = own.kind === 'audio'
  const replyToAudio = !body && quoted.kind === 'audio'
  if (!direct && !replyToAudio) return false

  const conn = extra.conn || extra.sock || (typeof this?.sendMessage === 'function' ? this : null) || global.conn

  await consumeAudioSession(conn, m, session, direct ? m : m.quoted, direct ? own : quoted)
  return true
}

async function handleAudioSticker(conn, m, {
  text,
  usedPrefix = '.',
  command = 'audiosticker'
}) {
  const {
    mode,
    text: rest
  } = parseModeFlag(text)
  const key = audioSessionKey(m)
  const session = audioSessions.get(key)

  if (/^(batal|cancel|stop)$/i.test(rest)) {
    if (!session) return m.reply('Tidak ada sesi Audio Sticker yang aktif.')
    clearAudioSession(key)
    return m.reply('Sesi Audio Sticker dibatalkan.')
  }

  if (!('audioStickerMessage' in proto.Message.prototype))
    return m.reply('Proto Baileys-nya belum punya audioStickerMessage. Update WAProto dulu.')

  const own = audioStickerMediaInfo(m)
  const quoted = audioStickerMediaInfo(m.quoted)

  const ownVisual = isVisualKind(own)
  const quotedVisual = isVisualKind(quoted)
  const quotedAudio = quoted.kind === 'audio'

  if (session && !session.processing && quotedAudio && !ownVisual)
    return consumeAudioSession(conn, m, session, m.quoted, quoted)
  if (!ownVisual && !quotedVisual && !quotedAudio) {
    if (session) {
      const sisa = Math.max(1, Math.ceil((session.expiresAt - Date.now()) / 1000))
      return m.reply(
        `⏳ *SESI MASIH AKTIF (${sisa} DETIK)*\n\n` +
        `Kirim *audio / VN* atau reply audio dengan \`${usedPrefix}${command}\`.\n` +
        `\`${usedPrefix}${command} batal\` untuk membatalkan.`,
      )
    }

    return m.reply(
      `✦ *AUDIO STICKER* ✦\n` +
      `> _Stiker gambar / GIF yang bersuara saat diketuk._\n\n` +
      `╭─「 *CARA PAKAI* 」\n` +
      `│ ◦ Reply *audio / VN* => pakai gambar menu bot\n` +
      `│ ◦ Kirim / reply *foto / stiker* => sesi ${AUDIO_SESSION_SECONDS} detik, lalu kirim audio\n` +
      `│ ◦ Kirim / reply *video* => suara penuh video jadi suara stiker (gambar stiker ${STICKER_VIDEO_MAX_SECONDS} detik pertama)\n` +
      `│ ◦ Foto + reply audio sekaligus => langsung jadi\n` +
      `│ ◦ Durasi audio bebas\n` +
      `╰───────────────\n\n` +
      `Custom pack: \`${usedPrefix}${command} Pack|Author\`\n` +
      `Mode video / foto: \`-crop\` \`-fit\` \`-auto\``,
    )
  }

  const [rawPack, rawAuthor] = rest.includes('|') ? rest.split('|').map(s => s.trim()) : [rest, '']
  const packName = rawPack || global.namebot || ''
  const publisher = rawAuthor || m.pushName || global.namebot || ''

  audioReact(conn, m, '⏳')

  try {
    if (!ownVisual && !quotedVisual) {
      const raw = await m.quoted.download()
      if (!raw?.length) throw new Error('Gagal mengunduh audio yang di-reply.')

      const audio = await prepareAudio(raw, quoted.seconds)
      const stickerBuf = await buildDefaultStickerBuffer({
        packName,
        publisher
      })

      await sendAudioSticker(conn, m.chat, stickerBuf, audio)
      audioReact(conn, m, '✅')
      return
    }

    const visualNode = ownVisual ? m : m.quoted
    const visualInfo = ownVisual ? own : quoted
    const isVideo = visualInfo.kind === 'video'

    const rawVisual = await visualNode.download()
    if (!rawVisual?.length) throw new Error('Gagal mengunduh media foto / video.')

    const stickerBuf = await buildStickerBuffer(rawVisual, visualInfo, {
      mode,
      packName,
      publisher
    })

    if (ownVisual && quotedAudio) {
      const raw = await m.quoted.download()
      if (!raw?.length) throw new Error('Gagal mengunduh audio yang di-reply.')

      const audio = await prepareAudio(raw, quoted.seconds)
      await sendAudioSticker(conn, m.chat, stickerBuf, audio)

      clearAudioSession(key)
      audioReact(conn, m, '✅')
      return
    }

    if (isVideo) {
      try {
        const audio = await prepareAudio(rawVisual, visualInfo.seconds)
        await sendAudioSticker(conn, m.chat, stickerBuf, audio)

        clearAudioSession(key)
        audioReact(conn, m, '✅')
        return
      } catch (e) {
        if (!e?.noAudio) throw e
        // video tanpa suara => lanjut ke sesi, tunggu audio
      }
    }

    audioReact(conn, m, '⏳')
    return startAudioSession(conn, m, {
      stickerBuf,
      packName,
      publisher,
      usedPrefix,
      command
    })
  } catch (e) {
    console.error('[audiosticker] gagal:', e)
    audioReact(conn, m, '❌')
    return m.reply(`Gagal bikin audio sticker.\n\n${e?.message || e}`)
  }
}

const handler = async (m, {
  conn,
  command,
  text,
  usedPrefix
}) => {
  if (AUDIO_STICKER_CMD.test(command || ''))
    return handleAudioSticker(conn, m, {
      text,
      usedPrefix,
      command
    })

  if (command === 'spack') {
    if (!m.quoted)
      return m.reply('Reply pesan album yang mau dijadiin sticker pack.')

    const {
      mode,
      text: cleanText
    } = parseModeFlag(text)

    const [rawName, rawDescription] = cleanText.split('|')
    const packName = rawName?.trim() || 'Nixel Album'
    const packDescription = rawDescription?.trim() || undefined

    const chatId = m.quoted.chat || m.chat
    const parentId = m.quoted.id

    const children = await waitForAlbumChildren(store, chatId, parentId)

    if (!children.length)
      return m.reply('Ga nemu media album di pesan ini setelah nunggu ~4 detik.\nKemungkinan store.js belum sempet nyimpen semua child-nya, atau ini emang bukan album — pastiin reply ke pesan album-nya.')

    return processAlbumToPack(conn, m, children, {
      mode,
      packName,
      packDescription,
      publisher: m.pushName
    })
  }

  const chatId = m.quoted?.chat || m.chat
  const albumAnchorId = m.quoted?.id || m.id || m.key?.id
  const {
    mode: stickerMode,
    text: stickerText
  } = parseModeFlag(text)

  if (albumAnchorId) {
    const expectedCount = m.message?.albumMessage ?
      (m.message.albumMessage.expectedImageCount || 0) + (m.message.albumMessage.expectedVideoCount || 0) :
      null

    const children = await waitForAlbumChildren(store, chatId, albumAnchorId, {
      expectedCount
    })

    if (children.length) {
      const [packname, author] = stickerText.split(/[,|\-+&]/)
      const packName = packname?.trim() || global.namebot
      const publisher = author?.trim() || m.pushName || global.namebot

      return processAlbumToPack(conn, m, children, {
        mode: stickerMode,
        packName,
        publisher
      })
    }
  }

  const q = m.quoted ? m.quoted : m
  const {
    mime,
    seconds
  } = detectMedia(q)

  if (!/image|video|webp/.test(mime))
    return m.reply('Kirim atau reply media untuk dijadikan stiker.')

  if (seconds > 20)
    return m.reply('Video harus berdurasi di bawah 20 detik.')

  const media = await q.download()

  if (/^video\//i.test(mime)) {
    try {
      const [packname, author] = stickerText.split(/[,|\-+&]/)

      const webp = await videoToStickerWebp(media, stickerMode)
      const withExif = await writeExif({
        mimetype: 'image/webp',
        data: webp
      }, {
        packName: packname?.trim() || global.namebot || '',
        packPublish: author?.trim() || m.pushName || global.namebot || '',
      }, )

      return conn.sendMessage(m.chat, {
        sticker: withExif
      }, {
        quoted: m
      })
    } catch (e) {
      console.error('[sticker] gagal convert video:', e)
      return m.reply(`Gagal convert video ke stiker.\n\n${e?.message || e}`)
    }
  }

  let exif

  if (stickerText) {
    const [packname, author] = stickerText.split(/[,|\-+&]/)
    exif = {
      packName: packname || '',
      packPublish: author || ''
    }
  }

  return conn.sendSticker(m.chat, media, m, exif)
}

handler.before = audioStickerBefore
handler.help = ['sticker', 'spack', 'audiosticker']
handler.tags = ['sticker']
handler.command = /^(s(tic?ker)?(gif)?|spack|audiosticker|stickeraudio|stikeraudio|stikaudio)$/i
handler.register = true

export default handler
