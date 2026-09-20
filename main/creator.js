import { readFileSync } from 'fs'
import { AIRich } from '../../lib/ui/MessageBuilder.js'

const OWNER_JID = '628xxxxxxxxx@s.whatsapp.net'
const THUMB = new URL('../../media/thumbnail.jpg', import.meta.url)

let handler = async (m, { conn }) => {
    let renz
    try {
        renz = await conn.profilePictureUrl(OWNER_JID, 'image')
    } catch {
        renz = 'https://i.ibb.co/2kR6bDq/avatar-contact.png'
    }

    let rich = new AIRich(conn)
    rich.addImage(readFileSync(THUMB), {
        width: 1080,
        height: 369
    })
    rich.addSection({
        view_model: {
            primitive: {
                __typename: 'GenAICompactEntityPrimitive',
                title: 'RennZSync',
                subtitle: 'Owner of 𝐋𝐘𝐍𝐍𝐀 𝐀𝐈',
                secondary_subtitle: 'software engineering',
                entity_id: 867051314767696,
                entity_url: 'https://whatsapp.com/channel/0029VbCJ0B0K0IBlYlYJ0W3c',
                entity_type: 'PAGE',
                action_type: 'FOLLOW',
                is_verified: true,
                image: {
                    url: renz,
                    url_fallback: renz
                }
            },
            __typename: 'GenAISingleLayoutViewModel'
        }
    })
    rich.addTip('Owner of 𝐋𝐘𝐍𝐍𝐍𝐀 𝐀𝐈'.replace('𝐍𝐍𝐍', '𝐍𝐍'))
    await rich.send(m.chat, { quoted: m })
}

handler.help = ['owner', 'creator']
handler.tags = ['main']
handler.command = /^(owner|creator|rennz|dev|developer)$/i

export default handler
