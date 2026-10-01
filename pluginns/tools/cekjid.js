let handler = async (m, { conn }) => {
    let targetJids = []

    if (m.quoted && m.quoted.sender) {
        targetJids.push(conn.decodeJid(m.quoted.sender))
    }

    let mentioned = m.mentionedJid || m.msg?.contextInfo?.mentionedJid || []
    if (mentioned.length) {
        for (let jid of mentioned) {
            targetJids.push(conn.decodeJid(jid))
        }
    }

    if (!targetJids.length) targetJids.push(m.sender)

    targetJids = [...new Set(targetJids)]

    const getName = (jid) => {
        let contact = conn.contacts?.[jid]
        return contact?.name || contact?.notify || contact?.subject || jid.split('@')[0]
    }

    let results = targetJids.map((jid, i) => {
        let number = jid.split('@')[0]
        let name = getName(jid)
        return `${i+1}. ${name}\n• JID : ${jid}\n• Nomor : ${number}`
    }).join('\n\n')

    await conn.reply(m.chat, `INFORMASI JID\n\n${results}`, m)
}

handler.command = ['cekjid']
export default handler
