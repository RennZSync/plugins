let handler = m => m

handler.before = async (m, { conn }) => {
    const fs = await import('fs')
    const BOT_JID = conn.user.id.split(':')[0] + '@s.whatsapp.net'
    const BOT_NUMBER = BOT_JID.split('@')[0]
    const fallback = '../../media/avatar_contact.png'

    if (!conn.__quotedThumbCache) conn.__quotedThumbCache = null

    const getThumb = async () => {
        if (conn.__quotedThumbCache) return conn.__quotedThumbCache
        try {
            const pp = await conn.profilePictureUrl(BOT_JID, 'image')
            const res = await fetch(pp)
            conn.__quotedThumbCache = Buffer.from(await res.arrayBuffer())
        } catch {
            conn.__quotedThumbCache = fs.readFileSync(fallback)
        }
        return conn.__quotedThumbCache
    }

    const buildQuoted = async (pushName) => {
        const thumb = await getThumb()
        return {
            key: {
                participant: '0@s.whatsapp.net',
                fromMe: false,
                id: 'StatusBiz',
                remoteJid: 'status@broadcast'
            },
            message: {
                contactMessage: {
                    displayName: `@${pushName || 'User'}`,
                    vcard: `BEGIN:VCARD
VERSION:3.0
N:${global.author || 'Bot'}
FN:${global.author || 'Bot'}
ORG:WhatsApp Bot;
TEL;type=CELL;type=VOICE;waid=${BOT_NUMBER}:${BOT_NUMBER}
END:VCARD`,
                    jpegThumbnail: thumb
                }
            }
        }
    }

    const originalReply = m.reply.bind(m)

    const wrappedReply = async (text, chatId, options = {}) => {
        const settings = global.db.data.settings[conn.user.jid] || {}
        const isOn = settings.quotedStatusAll

        if (isOn && !options.quoted) {
            options = { ...options, quoted: await buildQuoted(m.pushName) }
        }

        return originalReply(text, chatId, options)
    }

    try {
        Object.defineProperty(m, 'reply', {
            value: wrappedReply,
            writable: true,
            configurable: true,
            enumerable: false
        })
    } catch (e) {
        console.log('[quotedstatus] gagal override m.reply:', e.message)
    }

    if (!conn.__quotedStatusSendPatched) {
        conn.__quotedStatusSendPatched = true

        const originalSendMessage = conn.sendMessage.bind(conn)

        conn.sendMessage = async (jid, content = {}, options = {}) => {
            const settings = global.db.data.settings[conn.user.jid] || {}
            const isOn = settings.quotedStatusAll

            if (isOn && !options.quoted) {
                options = { ...options, quoted: await buildQuoted(m.pushName) }
            }

            return originalSendMessage(jid, content, options)
        }
    }
}

handler.all = true

export default handler
