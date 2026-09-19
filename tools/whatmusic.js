/**
 *  songfinder
 * -----------------------------
 * Type   : Plugins ESM
 * creator : Hilman, RennZSync 
 * Channel : https://whatsapp.com/channel/0029VbCJ0B0K0IBlYlYJ0W3c
 * API : https://audd.io
 */

export async function identifyAudio(buffer) {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: 'audio/mpeg' }), 'sample.mp3')
  form.append('api_token', 'test')
  form.append('return', 'spotify,apple_music')

  const res = await fetch('https://api.audd.io/', {
    method: 'POST',
    body: form
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  if (data.status !== 'success' || !data.result) return null
  return data.result
}

const handler = async (m, { conn, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || ''

  if (!/audio|video/.test(mime)) {
    return m.reply(`Kirim atau reply audio/video dengan perintah *${usedPrefix}${command}*`)
  }

  const loading = await conn.sendMessage(
    m.chat,
    { text: '🔍 Mendeteksi musik...' },
    { quoted: m }
  )
  const editMsg = async (text) => {
    try {
      await conn.sendMessage(m.chat, { text, edit: loading.key })
    } catch {
      await conn.sendMessage(m.chat, { text }, { quoted: m })
    }
  }

  try {
    const media = await q.download()
    const track = await identifyAudio(media)

    if (!track) return await editMsg('❌ Lagu tidak ditemukan / tidak terdeteksi.')

    const txt = `— *SONG IDENTIFIED* —\n\n` +
      `• *Judul:* ${track.title || '-'}\n` +
      `• *Artis:* ${track.artist || '-'}\n` +
      `• *Album:* ${track.album || '-'}\n` +
      `• *Rilis:* ${track.release_date || '-'}\n` +
      (track.spotify?.external_urls?.spotify ? `\n• Spotify Link: ${track.spotify.external_urls.spotify}` : '')

    await editMsg(txt.trim())
  } catch (error) {
    await editMsg(`❌ Error: ${error.message}`)
  }
}

handler.help = ['whatmusic', 'songfinder']
handler.tags = ['tools']
handler.command = /^(whatmusic|songfinder)$/i
handler.limit = true

export default handler
