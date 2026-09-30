import fs from 'fs'

let handler = m => m
handler.before = async (m, { conn }) => {
    if (!conn?.user?.jid) return

    const MY_JID = 'ISI_NOMOR_KALIAN@s.whatsapp.net'

    const buildQuoted = async () => {
        return {
            key: {
                remoteJid: 'status@broadcast',
                fromMe: false,
                id: 'VerifiedAdminInvite',
                participant: '0@s.whatsapp.net'
            },
            message: {
                newsletterAdminInviteMessage: {
                    newsletterJid: '120363383842602167@newsletter',
                    newsletterName: 'Starseed',
                    caption: '𝖵𝖾𝗋𝗂𝖿𝗂𝖾𝖽 𝖶𝗁𝖺𝗍𝗌𝖠𝗉𝗉 𝖠𝗎𝗍𝗈𝗆𝖺𝗍𝗂𝗈𝗇',
                    inviteExpiration: Math.floor(Date.now() / 1000) + 86400 // Expire 24 jam ke depan
                }
            }
        }
    }

    if (typeof m.reply === 'function') {
        const originalReply = m.reply.bind(m)

        const wrappedReply = async (text, chatId, options = {}) => {
            try {
                const settings = global.db?.data?.settings?.[conn.user.jid] || {}
                const isOn = settings.quotedNewsletterAll

                if (isOn && !options.quoted) {
                    options = { ...options, quoted: await buildQuoted() }
                }
            } catch (e) {
                console.error('[quotednewsletter] Error inside wrappedReply:', e)
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
            console.log('[quotednewsletter] Gagal override m.reply:', e.message)
        }
    }

    if (!conn.__quotedNewsletterSendPatched) {
        conn.__quotedNewsletterSendPatched = true
        const originalSendMessage = conn.sendMessage.bind(conn)

        conn.sendMessage = async (jid, content = {}, options = {}) => {
            try {
                const settings = global.db?.data?.settings?.[conn.user.jid] || {}
                const isOn = settings.quotedNewsletterAll

                if (isOn && !options.quoted) {
                    options = { ...options, quoted: await buildQuoted() }
                }
            } catch (e) {
                console.error('[quotednewsletter] Error inside sendMessage patch:', e)
            }

            return originalSendMessage(jid, content, options)
        }
    }

    if (!conn.__quotedNewsletterRelayPatched) {
        conn.__quotedNewsletterRelayPatched = true
        const originalRelayMessage = conn.relayMessage.bind(conn)

        conn.relayMessage = async (jid, message = {}, options = {}) => {
            try {
                const settings = global.db?.data?.settings?.[conn.user.jid] || {}
                const isOn = settings.quotedNewsletterAll

                if (isOn && !options.quoted) {
                    const messageKeys = Object.keys(message || {})
                    const isExceeded = messageKeys.some(key => 
                        ['orderMessage', 'pollCreationMessage', 'eventMessage', 'newsletterAdminInviteMessage'].includes(key)
                    )

                    if (!isExceeded) {
                        options = { ...options, quoted: await buildQuoted() }
                    }
                }
            } catch (e) {
                console.error('[quotednewsletter] Error inside relayMessage patch:', e)
            }

            return originalRelayMessage(jid, message, options)
        }
    }
}

handler.all = true

export default handler
