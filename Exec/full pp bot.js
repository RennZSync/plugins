=> (async () => {
    const sharp = (await import('sharp')).default 
    const media = await m.quoted.download()
    const image = await sharp(media)
    .resize(720, 720, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

    await conn.query({
        tag: 'iq',
        attrs: {
            to: '@s.whatsapp.net',
            type: "set",
            xmlns: 'w:profile:picture'
        },
        content: [{
            tag: 'picture',
            attrs: { type: 'image' },
            content: image
        }]
    })
})()

// coba aja