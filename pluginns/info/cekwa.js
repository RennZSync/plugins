import axios from 'axios'

let handler = async (m, {
  conn,
  text,
  usedPrefix,
  command,
  isOwner
}) => {
  let user = global.db?.data?.users?.[m.sender]
  if (!isOwner && user) {
    if (user.limit !== '∞' && user.limit < 5) {
      return m.reply(`Limit-mu kurang nih~ (｡•́︿•̀｡) fitur ini butuh 5 limit. Chat owner untuk tambah limit!`)
    }
  }

  let targetNumber = text ? text.replace(/[^0-9]/g, '') : ''

  if (!targetNumber && m.quoted) {
    targetNumber = m.quoted.sender ? m.quoted.sender.replace(/[^0-9]/g, '') : ''
  }

  if (!targetNumber && m.mentionedJid && m.mentionedJid[0]) {
    targetNumber = m.mentionedJid[0].replace(/[^0-9]/g, '')
  }

  if (!targetNumber) {
    return m.reply(
      `Masukkan nomor WhatsApp-nya dulu ya kawaii-chan~ 🌸\n\n` +
      `Contoh:\n${usedPrefix + command} 628xxxxxxxxxx\n\n` +
      `Atau reply pesan orangnya terus ketik *${usedPrefix + command}*`
    )
  }
  let initialMsg = await m.reply('_✨ lagi ngecek nomornya..._')

  try {
    const res = await axios.get(`https://kyuux-r.indevs.in/api/check-whatsapp?phone=${targetNumber}`, {
      timeout: 30000
    })
    const data = res.data

    if (!data?.success) throw new Error(data?.message || 'API tidak mengembalikan hasil')

    const d = data.data || {}
    await conn.sendMessage(m.chat, {
      react: {
        text: '✅',
        key: m.key
      }
    })

    let resultText = `✦ ݁˖ *WA CHECK*\n\n` +
      `✎ *number*: ${d.number || '-'}\n` +
      `✎ *status*: ${d.status || '-'}\n` +
      `✎ *banned*: ${d.banned === true ? 'Yes' : d.banned === false ? 'No' : '-'}\n` +
      `✎ *device*: ${d.info?.device || '-'}\n` +
      `✎ *email*: ${d.info?.email || '-'}`
    await conn.sendMessage(m.chat, {
      text: resultText,
      edit: initialMsg.key
    })
    if (!isOwner && user && user.limit !== '∞') {
      user.limit -= 5
    }

  } catch (e) {
    console.error('[cekwa] error:', e.message || e)
    await conn.sendMessage(m.chat, {
      react: {
        text: '❌',
        key: m.key
      }
    })
    let errorText = '❌ Gagal cek nomornya nih~ (T_T)\n\n' + (e.message || 'coba lagi nanti ya') + ' ✿'
    await conn.sendMessage(m.chat, {
      text: errorText,
      edit: initialMsg.key
    })
  }
}

handler.help = ['cekwa']
handler.tags = ['tools']
handler.command = /^(cekwa)$/i

export default handler
