import { downloadContentFromMessage, prepareWAMessageMedia, generateWAMessageFromContent } from 'baileys';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const handler = async (m, { conn, args, text, command, usedPrefix }) => {
    const isRegistered = global.db.data.users[m.sender]?.registered || false;
    const isCreator = global.owner.includes(m.sender);
    const isPrem = global.db.data.users[m.sender]?.premium || false;

    if (!isRegistered && !isCreator) {
        return m.reply(global.mess?.verifikasi || 'Silakan daftar terlebih dahulu!');
    }

    const checkLimit = () => {
        const user = global.db.data.users[m.sender];
        if (!user) return true;
        if (isPrem || isCreator) return false;
        return (user.limit || 0) <= 0;
    };

    if (checkLimit()) {
        return m.reply(global.mess?.limit || 'Limit Anda habis!');
    }

    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || '';

    if (!mime.startsWith('video/')) {
        return m.reply('Reply video dulu bro!');
    }

    if (!isPrem && !isCreator) {
        global.db.data.users[m.sender].limit = (global.db.data.users[m.sender].limit || 10) - 1;
    }

    await conn.sendMessage(m.chat, { react: { text: 'hourglass', key: m.key } });
    m.reply(global.mess?.wait || 'Tunggu sebentar...');

    try {
        const stream = await downloadContentFromMessage(q.msg || q, 'video');
        let videoBuffer = Buffer.from([]);

        for await (const chunk of stream) {
            videoBuffer = Buffer.concat([videoBuffer, chunk]);
        }

        const tmpVideo = `/tmp/lv_video_${Date.now()}.mp4`;
        const tmpThumb = `/tmp/lv_thumb_${Date.now()}.jpg`;

        fs.writeFileSync(tmpVideo, videoBuffer);

        let videoDuration = 0;

        await new Promise((resolve, reject) => {
            ffmpeg(tmpVideo)
                .on('metadata', (metadata) => {
                    videoDuration = Math.ceil(metadata.duration);
                })
                .outputOptions(['-vframes 1', '-q:v 2'])
                .output(tmpThumb)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        const thumbBuffer = fs.readFileSync(tmpThumb);

        fs.unlinkSync(tmpVideo);
        fs.unlinkSync(tmpThumb);

        const imageMedia = await prepareWAMessageMedia(
            { image: thumbBuffer },
            { upload: conn.waUploadToServer }
        );

        const videoMedia = await prepareWAMessageMedia(
            { video: videoBuffer },
            { upload: conn.waUploadToServer }
        );

        const photoMsg = generateWAMessageFromContent(
            m.chat,
            {
                imageMessage: {
                    ...imageMedia.imageMessage,
                    jpegThumbnail: thumbBuffer,
                    seconds: videoDuration,
                    contextInfo: {
                        pairedMediaType: 5,
                        statusSourceType: 0
                    }
                }
            },
            {}
        );

        await conn.relayMessage(m.chat, photoMsg.message, {
            messageId: photoMsg.key.id
        });

        await conn.relayMessage(
            m.chat,
            {
                videoMessage: {
                    ...videoMedia.videoMessage,
                    seconds: videoDuration,
                    contextInfo: {
                        pairedMediaType: 6,
                        statusSourceType: 0
                    }
                },
                messageContextInfo: {
                    messageAssociation: {
                        associationType: 12,
                        parentMessageKey: photoMsg.key
                    }
                }
            },
            {}
        );

        await conn.sendMessage(m.chat, { react: { text: 'check_mark', key: m.key } });

    } catch (e) {
        console.log(e);
        m.reply('Gagal membuat foto live. Coba lagi nanti.');
    }
};

handler.command = /^(cfotolive|clivephoto)$/i;
handler.help = ['cfotolive', 'clivephoto'];
handler.tags = ['media'];
handler.limit = true;
handler.premium = false;

export default handler;
