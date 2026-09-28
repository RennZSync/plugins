/**
 *group full pp no crops/pp group no size 
 *bisa kalian atur juga untuk quality dan size nya
 *By RennZSync 
 */

import sharp from 'sharp';

async function generateFullProfilePicture(buffer) {
  const img = await sharp(buffer)
    .resize(720, 720, {
      fit: 'inside'
    })
    .jpeg({
      quality: 90
    })
    .toBuffer();

  const preview = await sharp(buffer)
    .resize(96, 96, {
      fit: 'inside'
    })
    .jpeg({
      quality: 80
    })
    .toBuffer();

  return {
    img,
    preview
  };
}

const S_WHATSAPP_NET = '@s.whatsapp.net';

async function setFullProfilePicture(conn, jid, buffer) {
  const {
    img,
    preview
  } = await generateFullProfilePicture(buffer);

  await conn.query({
    tag: 'iq',
    attrs: {
      target: jid,
      to: S_WHATSAPP_NET,
      type: 'set',
      xmlns: 'w:profile:picture',
    },
    content: [{
        tag: 'picture',
        attrs: {
          type: 'image'
        },
        content: img,
      },
      {
        tag: 'picture',
        attrs: {
          type: 'preview'
        },
        content: preview,
      },
    ],
  });
}

let handler = async (m, {
  conn
}) => {
  try {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || '';

    if (!/image/.test(mime)) {
      return m.reply('Reply/kirim gambar buat dijadiin pp.');
    }

    let media;
    if (typeof q.download === 'function') {
      media = await q.download();
    } else if (typeof conn.downloadMediaMessage === 'function') {
      media = await conn.downloadMediaMessage(q);
    } else {
      throw new Error('tidak ada method download media di objek quoted/message.');
    }

    const jid = m.isGroup ? m.chat : conn.user.id;

    await setFullProfilePicture(conn, jid, media);

    m.reply('PP berhasil diset');
  } catch (e) {
    console.error('[fullpp error]', e);
    m.reply(`gagal set pp:\n${e.message || e}`);
  }
};

handler.help = ['fullpp', 'pppanjang'];
handler.tags = ['group'];
handler.command = /^(fullpp|pppanjang|setppfull)$/i;
handler.owner = true
handler.admin = true
export default handler;
