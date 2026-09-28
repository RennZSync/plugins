import crypto from 'crypto'
import { generateWAMessageFromContent } from 'baileys'
import { Button } from '../../lib/ui/MessageBuilder.js'

const HEADER_IMAGE = 'https://raw.githubusercontent.com/RennZSync/uploaders/main/anu/1790585777057-60027c4b.jpg'
const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCJ0B0K0IBlYlYJ0W3c'

const sectionGroups = [
  { title: 'UMUM', tags: ['main', 'info', 'fun', 'game', 'gag'] },
  { title: 'AI & TOOLS', tags: ['ai', 'tools', 'search', 'code', 'converter'] },
  { title: 'DOWNLOAD & MEDIA', tags: ['downloader', 'download', 'sticker', 'maker', 'media', 'newsletter', 'skiplink'] },
  { title: 'RPG & XP', tags: ['rpg', 'xp'] },
  { title: 'GROUP', tags: ['group'] },
  { title: 'STALK & ANIME', tags: ['stalk', 'stalker', 'anime', 'internet'] },
  { title: 'SISTEM', tags: ['owner', 'database', 'other'] }
]

const LABELS = { xp: 'XP & Level', rpg: 'RPG', ai: 'AI' }
const getLabel = tag => LABELS[tag] || tag.charAt(0).toUpperCase() + tag.slice(1)

const chunk = (arr, size) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function getTagIndex(prefix) {
  const index = Object.create(null)

  for (const plugin of Object.values(global.plugins)) {
    if (plugin.disabled) continue

    const helps = Array.isArray(plugin.help) ? plugin.help : plugin.help ? [plugin.help] : []
    if (!helps.length) continue

    const tags = Array.isArray(plugin.tags) ? plugin.tags : plugin.tags ? [plugin.tags] : ['other']
    const custom = 'customPrefix' in plugin
    const flags = [
      plugin.limit ? 'Ⓛ' : '',
      plugin.premium ? 'Ⓟ' : '',
      plugin.owner ? 'Ⓞ' : ''
    ].filter(Boolean).join(' ')

    for (const tag of tags) {
      if (!index[tag]) index[tag] = []
      for (const help of helps) {
        index[tag].push(`› ${custom ? help : prefix + help} ${flags}`.trimEnd())
      }
    }
  }

  return index
}
async function sendWidget(conn, jid, ui, btn, quoted) {
  const card = await btn.toCard()

  const msg = generateWAMessageFromContent(jid, {
    messageContextInfo: { messageSecret: crypto.randomBytes(32) },
    interactiveMessage: {
      ...card,
      nativeFlowMessage: { ...card.nativeFlowMessage, messageVersion: 1 },
      bloksWidget: ui.build(),
      contextInfo: btn._contextInfo
    }
  }, { quoted })

  await conn.relayMessage(msg.key.remoteJid, msg.message, {
    messageId: msg.key.id,
    additionalNodes: [{
      tag: 'biz',
      attrs: { actual_actors: '2', host_storage: '2', privacy_mode_ts: String(Math.floor(Date.now() / 1e3)) },
      content: [
        { tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] },
        { tag: 'quality_control', attrs: { decision_id: crypto.randomUUID().replace(/-/g, ''), source_type: 'third_party' }, content: [{ tag: 'decision_source', attrs: { value: 'df' } }] }
      ]
    }]
  })

  return msg
}

const handler = async (m, { conn, usedPrefix, command, isOwner, args }) => {
  const { A2UI } = await import('../../lib/ui/a2ui.js?date=' + Date.now())

  const query = (args[0] || '').toLowerCase().trim()
  const tagIndex = getTagIndex(usedPrefix)
  const allTags = Object.keys(tagIndex)

  const time = new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit'
  })
  const date = new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const botName = global.namebot || 'Bot'
  const ownerNum = (Array.isArray(global.owner)
    ? (global.owner[0]?.[0] || global.owner[0])
    : global.owner
  ).toString().replace(/[^0-9]/g, '')

  const visibleTags = allTags.filter(t => {
    if (t === 'owner' && !isOwner) return false
    if (t === 'group' && !m.isGroup) return false
    return true
  })
  const tag = query && visibleTags.find(k => k === query || getLabel(k).toLowerCase().includes(query))

  if (tag) {
    const items = tagIndex[tag]
    const label = getLabel(tag)
    const btn = new Button(conn)
      .setParams({
        limited_time_offer: {
          text: 'RennZSync',
          url: CHANNEL_URL,
          copy_code: '𝐋𝐘𝐍𝐍𝐀 𝐀𝐈',
          expiration_time: Date.now() + 3600000
        }
      })
      .setImage(HEADER_IMAGE)
      .setBody(`*${label.toUpperCase()} MENU*\nTotal ${items.length} command tersedia.`)
      .setFooter(botName)
      .setContextInfo({ expiration: 7776000 })

    btn._buttons.push({})
    btn.addReply('Menu Utama', `${usedPrefix}${command}`)

    const ui = new A2UI()

    const image = ui.image(HEADER_IMAGE, { variant: 'header' })
    const title = ui.text(`${label.toUpperCase()} MENU`, { variant: 'h1' })
    const info = ui.text(`${items.length} command  ·  ${time} WIB`, { variant: 'caption' })

    const cards = chunk(items, 15).map(part =>
      ui.card(ui.column([ui.text(part.join('\n'), { variant: 'body' })]))
    )

    const legend = ui.text('Ⓛ Limit   Ⓟ Premium   Ⓞ Owner', { variant: 'caption' })

    ui.root([image, title, info, ui.divider(), ...cards, ui.divider(), legend])

    return await sendWidget(conn, m.chat, ui, btn, m)
  }
  const known = new Set(sectionGroups.flatMap(g => g.tags))
  const loose = visibleTags.filter(t => !known.has(t))
  const groups = loose.length
    ? [...sectionGroups, { title: 'LAINNYA', tags: loose }]
    : sectionGroups

  const sections = []
  for (const group of groups) {
    const tags = group.tags.filter(t => visibleTags.includes(t))
    if (!tags.length) continue
    sections.push({
      title: group.title,
      rows: tags.map(t => ({
        title: getLabel(t),
        description: `${tagIndex[t].length} command`,
        id: `${usedPrefix}${command} ${t}`
      }))
    })
  }

  const btn = new Button(conn)
    .setParams({
      limited_time_offer: {
        text: 'RennZSync',
        url: CHANNEL_URL,
        copy_code: '𝐋𝐘𝐍𝐍𝐀 𝐀𝐈',
        expiration_time: Date.now() + 3600000
      },
      bottom_sheet: {
        in_thread_buttons_limit: 2,
        divider_indices: [1, 2],
        list_title: 'Menu',
        button_title: 'Lihat Semua'
      }
    })
    .setImage(HEADER_IMAGE)
    .setBody(`Halo @${m.sender.split('@')[0]}`)
    .setFooter(`© ${botName}`)
    .setContextInfo({ expiration: 7776000, mentionedJid: [m.sender] })

  btn._buttons.push({})
  btn.addSelection('Pilih Kategori')

  for (const s of sections) {
    btn.makeSection(s.title)
    for (const r of s.rows) btn.makeRow('', r.title, r.description, r.id)
  }

  btn
    .addUrl('Channel', CHANNEL_URL)
    .addUrl('Chat Owner', `https://wa.me/${ownerNum}`)

  const totalCmd = Object.values(global.plugins).filter(p => !p.disabled).length
  const ui = new A2UI()

  const image = ui.image(HEADER_IMAGE, { variant: 'header' })
  const title = ui.text(botName.toUpperCase(), { variant: 'h1' })
  const dateText = ui.text(`${date}  ·  ${time} WIB`, { variant: 'caption' })

  const stat = (name, value) =>
    ui.card(ui.column([
      ui.text(name, { variant: 'caption' }),
      ui.text(String(value), { variant: 'h3' })
    ]))

  const stats = ui.row([
    stat('Status', 'Online'),
    stat('Mode', m.isGroup ? 'Group' : 'Private'),
    stat('Command', totalCmd)
  ])

  const catTitle = ui.text('Daftar Kategori', { variant: 'h2' })

  const catCards = sections.map(s =>
    ui.card(ui.column([
      ui.text(`✦ ${s.title}`, { variant: 'h3' }),
      ui.text(s.rows.map(r => `› ${r.title}  (${r.description})`).join('\n'), { variant: 'body' })
    ]))
  )

  const hint = ui.text(
    `Pilih lewat tombol di bawah, atau ketik ${usedPrefix}${command} <kategori>`,
    { variant: 'caption' }
  )

  const bottomImage = ui.image(HEADER_IMAGE, { variant: 'mediumFeature' })

  ui.root([
    image,
    title,
    dateText,
    ui.divider(),
    stats,
    ui.divider(),
    catTitle,
    ...catCards,
    ui.divider(),
    hint,
    bottomImage
  ])

  await sendWidget(conn, m.chat, ui, btn, m)
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = /^(menu|help|\?)$/i
handler.exp = 1

export default handler
