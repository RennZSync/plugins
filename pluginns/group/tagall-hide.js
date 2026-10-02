import { proto, generateWAMessageFromContent } from 'baileys'

const handler = async (m, { conn }) => {
    if (!m.isGroup) return m.reply('Fitur ini hanya bisa digunakan di grup!')
    
    try {
        const metadata = await conn.groupMetadata(m.chat)
        const mentionedJid = metadata.participants.map(v => v.id)

        const msg = generateWAMessageFromContent(
            m.chat,
            proto.Message.create({
                albumMessage: {
                    contextInfo: {
                        mentionedJid
                    },
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    }
                }
            }),
            {
                userJid: conn.user.id,
                quoted: m
            }
        )

        await conn.relayMessage(m.chat, msg.message, {
            messageId: msg.key.id
        })
    } catch (error) {
        m.reply('Terjadi kesalahan: ' + error.message)
    }
}

handler.help = ['tagall', 'tagh']
handler.tags = ['group']
handler.command = /^tagh|tagall$/i
handler.owner = true
handler.group = true

export default handler
