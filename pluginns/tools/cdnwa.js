/* 
by nixel
hanya bertahan selama 1bulan
*/

import { Toolkit } from '../../lib/ui/MessageBuilder.js'

function formatFileSize(bytes) {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

let handler = async (m, { conn }) => {
    try {
        const q = m.quoted || m
        const mime = q.mimetype || q.msg?.mimetype

        if (!mime) throw new Error('Reply atau kirim media dulu')

        const buff = await q.download()
        if (!buff) throw new Error('Gagal download media')

        const size = formatFileSize(buff.length)

        const type = (q.mtype || 'document').replace(/Message/i, '')

        const link = await Toolkit.toUrl(conn, buff, type)

        const btn = new Button(conn)
            .setBody(
`📁 URL: ${link}
💾 Size: ${size}`
            )
            .addCopy('Copy Link', link)

        await btn.send(m.chat, { quoted: m })

    } catch (e) {
        m.reply(`Error: ${e.message || e}`)
    }
}

handler.command = /^cdnwa$/i
handler.tags = ['tools']

export default handler
