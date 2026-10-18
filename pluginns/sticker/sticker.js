import crypto from 'crypto'
import https from 'https'
import JSZip from 'jszip'
import ffmpeg from 'fluent-ffmpeg'
import { promises as fsp } from 'fs'
import os from 'os'
import path from 'path'
import { proto, downloadContentFromMessage } from 'baileys'
import store from '../../lib/store/store.js'
import { writeExif } from '../../lib/core/exif.js'

const MAX_STICKER_BYTES = 1024 * 1024
const BASE_WIDTH = 512
const MIN_WIDTH = 240
const RESOLUTION_STEP = 64
const ALBUM_ASSOCIATION_TYPE = 1
const MIN_RESIZE = 32
const ROUNDED_RATIO = 0.18
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

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

const FLAG_ALIASES = {
    crop: ['crop', 'c'],
    fit: ['fit'],
    circle: ['circle', 'bulat', 'bulet', 'lingkaran'],
    rounded: ['rounded', 'round', 'tumpul'],
    resize: ['resize', 'r'],
}

const FLAG_LOOKUP = new Map(
    Object.entries(FLAG_ALIASES).flatMap(([key, names]) => names.map(name => [name, key])),
)

function parseResize(value) {
    const match = String(value || '').match(/^(\d{2,4})(?:x(\d{2,4}))?$/i)
    if (!match) return null

    const clamp = n => Math.min(BASE_WIDTH, Math.max(MIN_RESIZE, Number(n)))
    return { w: clamp(match[1]), h: clamp(match[2] || match[1]) }
}

function parseStickerArgs(text = '') {
    const options = { mode: 'fit', shape: null, resize: null }
    const rest = []
    const tokens = String(text || '').trim().split(/\s+/).filter(Boolean)

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        const name = token.match(/^--?([a-z]+)$/i)?.[1]?.toLowerCase()
        const key = name && FLAG_LOOKUP.get(name)

        if (!key) {
            rest.push(token)
            continue
        }

        if (key === 'crop' || key === 'fit') {
            options.mode = key
        } else if (key === 'circle' || key === 'rounded') {
            options.shape = key
        } else if (key === 'resize') {
            const size = parseResize(tokens[i + 1])
            if (size) {
                options.resize = size
                i++
            }
        }
    }

    return { options, text: rest.join(' ') }
}

function hasEdits(options) {
    return options.mode === 'crop' || !!options.shape || !!options.resize
}

function resolveGeometry(options = {}, canvas = BASE_WIDTH) {
    const { mode, shape, resize } = options
    const cover = mode === 'crop' || shape === 'circle'

    let w = resize?.w ?? BASE_WIDTH
    let h = resize?.h ?? BASE_WIDTH
    if (shape === 'circle') w = h = Math.min(w, h)

    const scale = canvas / BASE_WIDTH
    return {
        cover,
        canvas,
        w: Math.max(2, Math.round(w * scale)),
        h: Math.max(2, Math.round(h * scale)),
    }
}

function shapeMaskSvg(shape, w, h) {
    const xmlns = 'xmlns="http://www.w3.org/2000/svg"'

    if (shape === 'circle') {
        const r = Math.min(w, h) / 2
        return `<svg ${xmlns} width="${w}" height="${h}"><circle cx="${w / 2}" cy="${h / 2}" r="${r}"/></svg>`
    }

    const r = Math.round(Math.min(w, h) * ROUNDED_RATIO)
    return `<svg ${xmlns} width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`
}

function alphaMaskExpr(shape) {
    if (shape === 'circle') {
        return 'if(lte(pow(X-W/2+0.5,2)+pow(Y-H/2+0.5,2),pow(min(W,H)/2,2)),255,0)'
    }

    const r = `(min(W,H)*${ROUNDED_RATIO})`
    return `if(lte(pow(max(max(${r}-X,X-W+${r}),0),2)+pow(max(max(${r}-Y,Y-H+${r}),0),2),pow(${r},2)),255,0)`
}

async function makeTrayWebp(buffer) {
    const sharpMod = await import('sharp').catch(() => null)
    if (!sharpMod?.default) throw new Error('Install sharp dulu:\nnpm i sharp')

    return await sharpMod.default(buffer, { animated: false })
        .resize(252, 252, { fit: 'cover' })
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
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .webp()
        .toBuffer()
}

async function makeThumbnailJpeg(buffer) {
    const sharpMod = await import('sharp').catch(() => null)
    if (!sharpMod?.default) throw new Error('Install sharp dulu:\nnpm i sharp')

    return await sharpMod.default(buffer)
        .resize(252, 252, { fit: 'cover' })
        .jpeg()
        .toBuffer()
}

async function uploadToServer(conn, buffer, { hkdf, mediaPath, mediaKey = crypto.randomBytes(32) }) {
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
        content: [{ tag: 'media_conn', attrs: {} }],
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

                const req = https.request(
                    {
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
packDescription = 'BY 𝐑𝐞𝐧𝐧𝐙𝐒𝐲𝐧𝐜 & 𝐋𝐘𝐍𝐍𝐀 𝐀𝐈', publisher) {
    const zip = new JSZip()
    const stickersMetadata = []
    const hydrated = pack.map(item => ({ ...item, buffer: toBuffer(item.buffer) }))

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

    const trayBuffer = traySource
        ? await makeTrayWebp(traySource)
        : await makeBlankTrayWebp()

    zip.file(trayIconFileName, trayBuffer)

    const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })

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
        m.chat,
        {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32),
            },
            stickerPackMessage: {
                stickerPackId: 'Pack_' + crypto.randomBytes(8).toString('hex'),
                name: packName,
                publisher: publisher || m.pushName || '𝐑𝐞𝐧𝐧𝐙𝐒𝐲𝐧𝐜',
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
        },
        {
            quoted: m,
        },
    )
}

function normalizeMessage(rmsg) {
    return proto.WebMessageInfo.toObject(
        proto.WebMessageInfo.fromObject(rmsg),
        {
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


async function waitForAlbumChildren(storeRef, chat, anchorId, { expectedCount = null, timeoutMs = 4000, intervalMs = 350 } = {}) {
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
    const clone = { ...media }

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

function ffprobeDuration(inputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, data) => {
            if (err) return reject(err)
            resolve(data?.format?.duration || 0)
        })
    })
}

const even = n => Math.max(2, Math.floor(n / 2) * 2)

function buildVideoFilters({ cover, shape, boxW, boxH, canvas, fullFrame }) {
    const filters = ['fps=15']

    if (cover) {
        filters.push(
            `scale=${boxW}:${boxH}:force_original_aspect_ratio=increase:flags=lanczos`,
            `crop=${boxW}:${boxH}`,
        )
    } else {
        filters.push(`scale=${boxW}:${boxH}:force_original_aspect_ratio=decrease:flags=lanczos`)
    }

    // Frame sudah penuh satu kanvas tanpa bentuk -> tidak butuh alpha / padding
    if (fullFrame) return filters

    filters.push('format=yuva420p')

    if (shape) {
        filters.push(`geq=lum='p(X,Y)':cb='p(X,Y)':cr='p(X,Y)':a='${alphaMaskExpr(shape)}'`)
    }

    filters.push(`pad=${canvas}:${canvas}:(ow-iw)/2:(oh-ih)/2:color=black@0.0`)

    return filters
}

function encodeAnimatedWebp(inputPath, outputPath, { duration, filters, alpha }) {
    const outputOptions = ['-loop', '0', '-preset', 'default', '-an', '-vsync', '0', '-vcodec', 'libwebp']
    if (alpha) outputOptions.push('-pix_fmt', 'yuva420p')

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

async function videoToStickerWebp(buffer, options = {}) {
    const tmpDir = os.tmpdir()
    const uid = crypto.randomBytes(6).toString('hex')
    const inputPath = path.join(tmpDir, `spack-in-${uid}.mp4`)

    await fsp.writeFile(inputPath, buffer)

    try {
        const rawDuration = await ffprobeDuration(inputPath)

        let duration = Math.min(rawDuration || 10, 10)
        let width = BASE_WIDTH
        let result

        for (let i = 0; i < 30; i++) {
            const outputPath = path.join(tmpDir, `spack-out-${uid}-${i}.webp`)

            const geo = resolveGeometry(options, width)
            const boxW = even(geo.w)
            const boxH = even(geo.h)
            const canvas = even(geo.canvas)
            const fullFrame = geo.cover && !options.shape && boxW === canvas && boxH === canvas

            const filters = buildVideoFilters({
                cover: geo.cover,
                shape: options.shape,
                boxW,
                boxH,
                canvas,
                fullFrame,
            })

            await encodeAnimatedWebp(inputPath, outputPath, { duration, filters, alpha: !fullFrame })

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

async function imageToStickerWebp(buffer, options = {}) {
    const sharpMod = await import('sharp').catch(() => null)
    if (!sharpMod?.default) throw new Error('Install sharp dulu:\nnpm i sharp')

    const sharp = sharpMod.default

    let width = BASE_WIDTH
    let result

    for (let i = 0; i < 20; i++) {
        const geo = resolveGeometry(options, width)

        let { data, info } = await sharp(buffer)
            .rotate()
            .resize(
                geo.w,
                geo.h,
                geo.cover ? { fit: 'cover', position: 'centre' } : { fit: 'inside' },
            )
            .ensureAlpha()
            .png()
            .toBuffer({ resolveWithObject: true })

        if (options.shape) {
            data = await sharp(data)
                .composite([{
                    input: Buffer.from(shapeMaskSvg(options.shape, info.width, info.height)),
                    blend: 'dest-in',
                }])
                .png()
                .toBuffer()
        }

        const left = Math.floor((width - info.width) / 2)
        const top = Math.floor((width - info.height) / 2)

        const out = await sharp(data)
            .extend({
                top,
                bottom: width - info.height - top,
                left,
                right: width - info.width - left,
                background: TRANSPARENT,
            })
            .webp({ quality: 80 })
            .toBuffer()

        result = out

        if (out.length <= MAX_STICKER_BYTES) break
        if (width <= MIN_WIDTH) break

        width = Math.max(MIN_WIDTH, width - RESOLUTION_STEP)
    }

    return result
}

async function convertAlbumChild(mediaType, buffer, options) {
    if (mediaType === 'imageMessage') {
        const webp = await imageToStickerWebp(buffer, options)
        return { buffer: webp, ext: 'webp', mimetype: 'image/webp', isAnimated: false, isLottie: false }
    }

    if (mediaType === 'videoMessage') {
        const webp = await videoToStickerWebp(buffer, options)
        return { buffer: webp, ext: 'webp', mimetype: 'image/webp', isAnimated: true, isLottie: false }
    }

    return null
}

async function processAlbumToPack(conn, m, children, { options, packName, packDescription, publisher }) {
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

            const converted = await convertAlbumChild(mediaType, rawBuffer, options)
            if (!converted) continue

            const withExif = await writeExif(
                { mimetype: 'image/webp', data: converted.buffer },
                { packName: packName || '', packPublish: publisher || '' },
            )

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

async function sendEditedSticker(conn, m, media, kind, options, { packName, publisher }) {
    const webp = kind === 'video'
        ? await videoToStickerWebp(media, options)
        : await imageToStickerWebp(media, options)

    const withExif = await writeExif(
        { mimetype: 'image/webp', data: webp },
        { packName: packName || '', packPublish: publisher || '' },
    )

    return conn.sendMessage(m.chat, { sticker: withExif }, { quoted: m })
}


function detectMedia(q) {
    const direct = q?.mimetype || q?.msg?.mimetype
    if (direct) {
        return {
            mime: direct,
            seconds: q?.seconds ?? q?.msg?.seconds ?? 0,
            animated: !!(q?.isAnimated ?? q?.msg?.isAnimated),
        }
    }

    const message = q?.message || q?.msg?.message
    if (message) {
        for (const t of ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage']) {
            if (message[t]?.mimetype) {
                return {
                    mime: message[t].mimetype,
                    seconds: message[t].seconds || 0,
                    animated: !!message[t].isAnimated,
                }
            }
        }
    }

    return { mime: '', seconds: 0, animated: false }
}

const USAGE_TEXT = [
    'Kirim atau reply media untuk dijadikan stiker.',
    '',
    'Opsi (boleh digabung, urutan bebas):',
    '*-crop:* `crop jadi kotak`',
    '*-fit:* `gambar utuh, sisanya transparan (default)`',
    '*-circle / -bulat:* `bentuk lingkaran`',
    '*-rounded:* `sudut melengkung`',
    '*-resize 256x256:* `perkecil ukuran stiker`',
    '',
    'Contoh:',
    '.s -circle',
    '.s -crop -rounded NamaPack|Author',
    '.s -resize 256',
].join('\n')

const handler = async (m, { conn, command, text }) => {
    const { options, text: cleanText } = parseStickerArgs(text)

    if (command === 'spack') {
        if (!m.quoted)
            return m.reply(
                'Reply pesan album yang mau dijadiin sticker pack.\n\n' +
                'Opsi: -crop, -fit, -circle, -rounded, -resize 256x256\n' +
                'Contoh: .spack -circle Nama Pack|Deskripsi',
            )

        const [rawName, rawDescription] = cleanText.split('|')
        const packName = rawName?.trim() || 'Nixel Album'
        const packDescription = rawDescription?.trim() || undefined

        const chatId = m.quoted.chat || m.chat
        const parentId = m.quoted.id

        const children = await waitForAlbumChildren(store, chatId, parentId)

        if (!children.length)
            return m.reply('Ga nemu media album di pesan ini setelah nunggu ~4 detik.\nKemungkinan store.js belum sempet nyimpen semua child-nya, atau ini emang bukan album — pastiin reply ke pesan album-nya.')

        return processAlbumToPack(conn, m, children, { options, packName, packDescription, publisher: m.pushName })
    }

    const chatId = m.quoted?.chat || m.chat
    const albumAnchorId = m.quoted?.id || m.id || m.key?.id

    if (albumAnchorId) {
        const expectedCount = m.message?.albumMessage
            ? (m.message.albumMessage.expectedImageCount || 0) + (m.message.albumMessage.expectedVideoCount || 0)
            : null

        const children = await waitForAlbumChildren(store, chatId, albumAnchorId, { expectedCount })

        if (children.length) {
            const [packname, author] = cleanText.split(/[,|\-+&]/)
            const packName = packname?.trim() || global.namebot
            const publisher = author?.trim() || m.pushName || global.namebot

            return processAlbumToPack(conn, m, children, { options, packName, publisher })
        }
    }

    const q = m.quoted ? m.quoted : m
    const { mime, seconds, animated } = detectMedia(q)

    if (!/image|video|webp/.test(mime))
        return m.reply(USAGE_TEXT)

    if (seconds > 20)
        return m.reply('Video harus berdurasi di bawah 20 detik.')

    const edited = hasEdits(options)

    if (edited && animated && /webp/.test(mime))
        return m.reply('Stiker animasi belum bisa diedit pakai opsi ini. Kirim video/gif aslinya aja ya.')

    const media = await q.download()
    const [packname, author] = cleanText.split(/[,|\-+&]/)

    if (edited) {
        const kind = /video|gif/.test(mime) ? 'video' : 'image'

        try {
            return await sendEditedSticker(conn, m, media, kind, options, {
                packName: packname?.trim() || global.namebot,
                publisher: author?.trim() || m.pushName || global.namebot,
            })
        } catch (e) {
            console.error('[sticker] gagal bikin stiker:', e)
            return m.reply(`Gagal bikin stiker: ${e?.message || e}`)
        }
    }

    let exif

    if (cleanText) {
        exif = { packName: packname || '', packPublish: author || '' }
    }

    return conn.sendSticker(m.chat, media, m, exif)
}

handler.help = ['sticker', 'spack']
handler.tags = ['sticker']
handler.command = /^(s(tic?ker)?(gif)?|spack)$/i
handler.register = true

export default handler
