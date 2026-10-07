import fetch from 'node-fetch';

const DEFAULT_URL = 'https://aboutt-rennz.vercel.app';

const THEMES = {
  default: '65CBED',
  biru: '1E88E5',
  merah: 'E53935',
  hijau: '43A047',
  ungu: '8E24AA',
  pink: 'EC407A',
  oranye: 'FB8C00',
  kuning: 'FDD835',
  tosca: '00ACC1',
  hitam: '212121',
  putih: 'FAFAFA'
};

const hexToArgb = (hex) => parseInt('FF' + hex.replace('#', ''), 16) >>> 0;

const isColor = (v) => {
  v = v.toLowerCase();
  return v === 'random' || !!THEMES[v] || /^#[0-9a-f]{6}$/i.test(v) || /^\d{6,}$/.test(v);
};

const parseColor = (input) => {
  const v = (input || '').trim().toLowerCase();
  if (!v) return hexToArgb(THEMES.default);
  if (v === 'random') {
    const keys = Object.keys(THEMES);
    return hexToArgb(THEMES[keys[Math.floor(Math.random() * keys.length)]]);
  }
  if (THEMES[v]) return hexToArgb(THEMES[v]);
  if (/^#[0-9a-f]{6}$/i.test(v)) return hexToArgb(v);
  if (/^\d+$/.test(v)) return parseInt(v);
  return hexToArgb(THEMES.default);
};

const parseExtras = (fields) => {
  let url = '', imageUrl = '', color = '';
  for (const f of fields) {
    if (!f) continue;
    if (/^https?:\/\/\S+\.(jpe?g|png|webp|gif)(\?\S*)?$/i.test(f)) imageUrl = f;
    else if (/^https?:\/\//i.test(f)) url = f;
    else if (isColor(f)) color = f;
  }
  return { url: url || DEFAULT_URL, imageUrl, color };
};

const getThumb = async (m, imageUrl) => {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mediaType || '';
  if (/image/.test(mime)) {
    try {
      const buf = await q.download();
      if (buf?.length) return buf;
    } catch {}
  }
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl);
      return Buffer.from(await res.arrayBuffer());
    } catch {}
  }
  return null;
};

const resizeThumb = async (buffer) => {
  try {
    const { default: sharp } = await import('sharp');
    return await sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();
  } catch {
    return buffer;
  }
};

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (text && text.trim().toLowerCase() === 'tema') {
    return m.reply(
`Pilihan tema warna:
${Object.keys(THEMES).map(t => `• ${t}`).join('\n')}
• random

Bisa juga hex (#ff5722) atau angka ARGB.`);
  }

  if (!text) {
    return m.reply(
`Format:
${usedPrefix}${command} teks|judul|deskripsi|warna

Setelah deskripsi, urutan bebas & opsional:
• warna (tema / #hex / random)
• url (https://...)
• link gambar (.jpg/.png)

Reply / kirim foto untuk thumbnail.
Lihat tema: ${usedPrefix}${command} tema

Contoh:
${usedPrefix}${command} Halo semua|𝐑𝐞𝐧𝐧𝐙𝐒𝐲𝐧𝐜|𝐋𝐘𝐍𝐍𝐀 𝐀𝐈|biru`);
  }

  const [caption, title = '𝐑𝐞𝐧𝐧𝐙𝐒𝐲𝐧𝐜', description = '', ...rest] =
    text.split('|').map(p => p.trim());

  const { url, imageUrl, color } = parseExtras(rest);

  try {
    let thumb = await getThumb(m, imageUrl);
    if (thumb) thumb = await resizeThumb(thumb);

    await conn.relayMessage(
      m.chat,
      {
        extendedTextMessage: {
          text: `${caption}\n\n${url}`,
          matchedText: url,
          canonicalUrl: url,
          description,
          title,
          backgroundArgb: parseColor(color),
          previewType: 0,
          ...(thumb ? { jpegThumbnail: thumb } : {}),
          contextInfo: {
            participant: '0@s.whatsapp.net',
            quotedMessage: {
              newsletterAdminInviteMessage: {
                newsletterJid: '1@newsletter',
                newsletterName: title,
                caption: description,
                inviteExpiration: 0
              }
            },
            remoteJid: '0@s.whatsapp.net',
            forwardingScore: 999,
            isForwarded: true,
            expiration: 86400,
            disappearingMode: { initiator: 0 }
          }
        },
        messageContextInfo: {
          messageSecret: Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15)
        }
      },
      {
        additionalNodes: [{ tag: 'meta', attrs: { is_group_status: 'true' } }]
      }
    );

    m.reply('Berhasil dikirim!');
  } catch (error) {
    console.error(error);
    m.reply('Terjadi kesalahan: ' + error.message);
  }
};

handler.help = ['swgcthumb'];
handler.tags = ['tools'];
handler.command = /^(swgcthumb|swgc2|suapabusa)$/i;
handler.owner = true;
handler.group = true;

export default handler;
