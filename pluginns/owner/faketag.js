/* 
plugins/owner/faketag.js
Multi fake-tag: tiap tag = groupJid RANDOM unik + groupSubject
by 𝐑𝐞𝐧𝐧𝐙𝐒𝐲𝐧𝐜 

Format:
.faketag @A|@B|@C
.faketag join ada @A|@B| teks
.faketag @Mark Zuckerberg
@ Elon Musk
@ Messi
.faketag Mark Zuckerberg | halo

Enter (newline) dari pesan asli ikut dipertahankan.
*/

const MAX_TAGS = 1000000

function randomGroupJid() {
  const a = 120363000000000000n + BigInt(Math.floor(Math.random() * 1e12))
  const b = BigInt(Date.now() % 1e9) * 1000n + BigInt(Math.floor(Math.random() * 999))
  return `${a + b}@g.us`
}

function tidy(s) {
  return String(s || '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanName(n) {
  return String(n || '')
    .replace(/^@+/, '')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '') // bidi marks
    .trim()
}

/**
 * Multi via | :
 * "join ada @ A|@ B| teks" → prefix, tags, suffix
 * Kalau input ada enter, hasil juga pakai enter.
 */
function parsePipe(input) {
  if (!input.includes('|')) return null
  const parts = input.split('|').map((s) => s.trim())
  if (parts.length < 2) return null

  const tags = []
  let prefix = ''
  let suffix = ''

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    const at = part.lastIndexOf('@')
    if (at === -1) {
      if (i === 0 && !tags.length) prefix = part
      else suffix = suffix ? `${suffix} ${part}` : part
      continue
    }
    const before = part.slice(0, at).replace(/[ \t]+$/g, '')
    const name = cleanName(part.slice(at + 1))
    if (!name) continue
    if (i === 0 && before) prefix = before
    tags.push(name)
  }

  if (!tags.length) return null
  return { prefix, tags, suffix, sep: input.includes('\n') ? '\n' : ' ' }
}

/**
 * Multi via newline / banyak @ di baris:
 * @ Mark Zuckerberg
 * @ Elon Musk
 * atau:
 * halo
 * @ A
 * @ B
 * jir
 */
function parseLines(input) {
  const lines = String(input).split(/\r?\n/)
  const tags = []
  const preLines = []
  const sufLines = []
  let seenTag = false

  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      if (seenTag) sufLines.push('')
      else preLines.push('')
      continue
    }
    if (t.startsWith('@')) {
      const name = cleanName(t)
      if (name) {
        tags.push(name)
        seenTag = true
      }
      continue
    }
    if (seenTag) sufLines.push(line)
    else preLines.push(line)
  }

  if (tags.length < 2 && !input.includes('@')) return null
  if (!tags.length) return null

  return {
    prefix: preLines.join('\n').trimEnd(),
    tags,
    suffix: sufLines.join('\n').trimStart(),
    sep: '\n'
  }
}

/** Satu tag legacy: "Nama" atau "Nama | pesan" */
function parseLegacy(input) {
  const atLines = input.split(/\r?\n/).filter((l) => l.trim().startsWith('@'))
  if (atLines.length >= 2) return null

  if (input.includes('|')) {
    const i = input.indexOf('|')
    const nama = cleanName(input.slice(0, i))
    const pesan = input.slice(i + 1).trim()
    if (!nama) return null
    return { tags: [nama], pesan }
  }

  const one = input.trim()
  if (one.startsWith('@') || !one.includes('\n')) {
    const nama = cleanName(one.split(/\r?\n/)[0])
    if (!nama) return null
    return { tags: [nama], pesan: '' }
  }
  return null
}

function buildMentions(tags) {
  return tags.slice(0, MAX_TAGS).map((name) => ({
    groupJid: randomGroupJid(),
    groupSubject: name
  }))
}

function buildText(prefix, mentions, suffix, sep) {
  const mentionText =
    sep === '\n'
      ? mentions.map((m) => `@${m.groupJid}`).join('\n')
      : mentions.map((m) => `@${m.groupJid}`).join(' ')

  let out = ''
  const p = String(prefix || '')
  const s = String(suffix || '')

  if (p) {
    out = p
    if (sep === '\n') {
      if (!out.endsWith('\n')) out += '\n'
    } else if (!/[\s\n]$/.test(out)) out += ' '
  }

  out += mentionText

  if (s) {
    if (sep === '\n') {
      if (!out.endsWith('\n')) out += '\n'
      out += s
    } else {
      if (!/^\s/.test(s) && !/[\s\n]$/.test(out)) out += ' '
      out += s
    }
  }

  return tidy(out)
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const { generateWAMessageFromContent } = await import('baileys')

  // pakai teks mentah supaya enter tidak hilang (args sudah kepecah per spasi/enter)
  const raw = typeof text === 'string' && text.length ? text : String(m.text || '').replace(/^\S+\s*/, '')
  const input = String(raw).trim()

  if (!input) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          `*Multi (| ):*\n${usedPrefix}${command} join @Mark|@Meta| teks\n\n` +
          `*Multi (baris):*\n${usedPrefix}${command} @Mark Zuckerberg\n@Elon Musk\n@Messi\n\n` +
          `*Satu tag:*\n${usedPrefix}${command} Mark Zuckerberg | halo`
      },
      { quoted: m }
    )
  }

  let groupMentions = []
  let textBody = ''

  const pipe = parsePipe(input)
  const lines = !pipe ? parseLines(input) : null

  if (pipe && pipe.tags.length) {
    groupMentions = buildMentions(pipe.tags)
    textBody = buildText(pipe.prefix, groupMentions, pipe.suffix, pipe.sep)
  } else if (lines && lines.tags.length) {
    groupMentions = buildMentions(lines.tags)
    textBody = buildText(lines.prefix, groupMentions, lines.suffix, lines.sep)
  } else {
    const leg = parseLegacy(input)
    if (!leg) return m.reply('❌ Nama tag kosong.')
    groupMentions = buildMentions(leg.tags)
    textBody = leg.pesan
      ? buildText('', groupMentions, leg.pesan, ' ')
      : groupMentions.map((mm) => `@${mm.groupJid}`).join(' ')
  }

  if (!groupMentions.length) {
    return m.reply('❌ Tidak ada tag terdeteksi.')
  }

  await m.react('🕕').catch(() => {})

  try {
    const msg = generateWAMessageFromContent(
      m.chat,
      {
        extendedTextMessage: {
          endCardTiles: [],
          text: textBody,
          previewType: 0,
          contextInfo: {
            mentionedJid: [],
            groupMentions,
            statusAttributions: []
          },
          inviteLinkGroupTypeV2: 0
        }
      },
      { userJid: conn.user.id }
    )

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    await m.react('✅').catch(() => {})
  } catch (e) {
    console.error('[faketag]', e)
    await m.react('❌').catch(() => {})
    return m.reply(`❌ ${String(e?.message || e).slice(0, 160)}`)
  }
}

handler.help = ['faketag @A|@B|@C', 'faketag Nama | pesan']
handler.tags = ['owner']
handler.command = ['faketag', 'ftag']
handler.owner = true
handler.group = false

export default handler
