let handler = async (m, { conn }) => {

  const owners = ['NOMOR_KAMU']
  // itu sebagai white list 
  // JANGAN PAKE + DAN 08 MISAL 628XXXXXXX
  const sender = m.sender.split('@')[0]

  if (!m.isGroup) return m.reply(' _*HANYA DI GROUP*_ ')
  if (!owners.includes(sender)) return m.reply(' _*hanya owner yang bisa pakai*_ ')

  let group = await conn.groupMetadata(m.chat)
  let participants = group.participants
  let members = participants
    .filter(p => p.admin === null)
    .map(p => p.id)

  if (!members.length) {
    return m.reply('tidak bisa')
  }

  m.reply(`pembersihan di mulai...\n member: ${members.length}`)

  try {
    await conn.groupParticipantsUpdate(m.chat, members, "remove")
  } catch (e) {

    for (let user of members) {
      try {
        await conn.groupParticipantsUpdate(m.chat, [user], "remove")
        await new Promise(r => setTimeout(r, 1200))
      } catch {}
    }

  }

  m.reply(' _*SUCCSESS*_ ')
}

handler.help = ['kudetakick']
handler.tags = ['group']
handler.command = /^kudetakick$/i
handler.group = true
handler.botAdmin = true

export default handler
