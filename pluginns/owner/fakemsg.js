//Nixel
import { delay } from 'baileys';

const handler = async (m, { conn, text }) => {
	if (!m.quoted) {
		return m.reply('Reply pesan yang ingin diproses.');
	}

	if (!text) {
		return m.reply('Masukkan teks pengganti.');
	}

	if (!m.isGroup) {
		return m.reply('Command ini hanya bisa digunakan di grup.');
	}

	const stanzaId = m.quoted.id;

	try {
		const tempId = await conn.relayMessage(
			m.chat,
			{
				extendedTextMessage: {
					text: '',
					contextInfo: {
						isGroupStatus: true
					}
				}
			},
			{
				quoted: m
			}
		);

		const tempId2 = await conn.relayMessage(
			m.chat,
			{
				protocolMessage: {
					key: {
						jid: m.chat,
						fromMe: true,
						id: tempId
					},
					type: 14,
					editedMessage: {
						extendedTextMessage: {
							text,
							contextInfo: {
								isGroupStatus: false
							}
						}
					}
				}
			},
			{
				messageId: stanzaId
			}
		);

		await delay(100);

		await Promise.allSettled([
			conn.sendMessage(m.chat, {
				delete: {
					remoteJid: m.chat,
					id: tempId,
					fromMe: true
				}
			}),
			conn.sendMessage(m.chat, {
				delete: {
					remoteJid: m.chat,
					id: tempId2,
					fromMe: true
				}
			})
		]);
	} catch (e) {
		console.error('[fakemsg]', e);
		await m.reply('Error: ' + (e?.message || e));
	}
};

handler.help = ['fakemsg'];
handler.tags = ['owner'];
handler.command = /^fakemsg$/i;
handler.owner = true;
handler.admin = true;
handler.group = true;

export default handler;
