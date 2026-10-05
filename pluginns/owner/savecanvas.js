import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync
} from 'fs'
import path from 'path'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const canvasDir = path.resolve('./lib/canvas')

  if (!existsSync(canvasDir)) {
    try {
      mkdirSync(canvasDir, { recursive: true })
    } catch (e) {
      console.error('[CANVAS MKDIR]', e)
      throw `❌ Gagal membuat folder canvas.\n\n${e.message}`
    }
  }

  const isList = /^listcanvas$/i.test(command)
  const isSave = /^savecanvas$/i.test(command)
  const isGet = /^getcanvas$/i.test(command)
  const isDelete = /^(deletecanvas|dc)$/i.test(command)

  if (isList) {
    let files

    try {
      files = readdirSync(canvasDir)
        .filter(file => file.toLowerCase().endsWith('.js'))
        .sort()
    } catch (e) {
      console.error('[CANVAS LIST]', e)
      throw `❌ Gagal membaca folder canvas.\n\n${e.message}`
    }

    let txt = `*Daftar Canvas*\n\n`
    txt += `• *Total* : ${files.length}\n`
    txt += `• *List* :\n\n`

    if (!files.length) {
      txt += `◦ Belum ada canvas.`
    } else {
      for (const file of files) {
        txt += `◦ ${file.replace(/\.js$/i, '')}\n`
      }
    }

    return conn.sendMessage(
      m.chat,
      { text: txt },
      { quoted: m }
    )
  }

  const validateFilename = filename => {
    if (!filename) {
      throw `Contoh:\n${usedPrefix + command} bratvid`
    }

    filename = filename.trim()

    if (!/^[a-zA-Z0-9_-]+(?:\.js)?$/.test(filename)) {
      throw '❌ Nama file hanya boleh menggunakan huruf, angka, `_`, dan `-`.'
    }

    if (!filename.toLowerCase().endsWith('.js')) {
      filename += '.js'
    }

    return filename
  }

  if (isSave) {
    if (!args[0]) {
      throw `Contoh:
${usedPrefix + command} bratvid

Reply source code atau kirim source setelah nama file.`
    }

    const filename = validateFilename(args.shift())
    const target = path.join(canvasDir, filename)

    let content = ''

    if (m.quoted?.text) {
      content = m.quoted.text.trim()
    } else {

      content = args.join(' ').trim()

      if (!content && text) {
        const parts = text.trim().split(/\s+/)
        parts.shift()
        content = parts.join(' ').trim()
      }
    }

    if (!content) {
      throw `Reply source code atau kirim source setelah nama file.

Contoh:
${usedPrefix + command} bratvid <source code>`
    }

    try {
      writeFileSync(target, content, 'utf8')
    } catch (e) {
      console.error('[SAVE CANVAS]', e)

      if (e.code === 'EACCES') {
        throw `❌ Tidak bisa menyimpan canvas.

*Folder:* ${canvasDir}

Penyebab: permission folder tidak mengizinkan bot menulis file.`
      }

      throw `❌ Gagal menyimpan canvas.

${e.message}`
    }

    return m.reply(
`*Save Canvas*

• *Status* : Berhasil disimpan.
• *File* : ${filename}
• *Path* : lib/canvas/${filename}`
    )
  }

  if (isGet || isDelete) {
    if (!args[0]) {
      throw `Contoh:
${usedPrefix + command} bratvid

Lihat daftar canvas:
${usedPrefix}listcanvas`
    }

    const filename = validateFilename(args[0])
    const target = path.join(canvasDir, filename)

    if (!existsSync(target)) {
      throw `❌ Canvas *${filename}* tidak ditemukan.`
    }

    if (isGet) {
      let content

      try {
        content = readFileSync(target, 'utf8')
      } catch (e) {
        console.error('[GET CANVAS]', e)
        throw `❌ Gagal membaca canvas.

${e.message}`
      }

      return new Button(conn)
        .setBody(
`*\`${path.basename(filename)}\`*

• *Status* : Berhasil ditemukan.
• *Path* : lib/canvas/${filename}
• *Aksi* : Tekan tombol di bawah untuk menyalin source code.`
        )
        .addCopy('Copy', content)
        .send(m.chat)
    }
    
    if (isDelete) {
      try {
        unlinkSync(target)
      } catch (e) {
        console.error('[DELETE CANVAS]', e)
        throw `❌ Gagal menghapus canvas.

${e.message}`
      }

      return m.reply(
`*Delete Canvas*

• *Status* : Berhasil dihapus.
• *File* : ${filename}`
      )
    }
  }
}

handler.help = [
  'listcanvas',
  'savecanvas',
  'getcanvas',
  'deletecanvas',
  'dc'
]

handler.tags = ['owner']
handler.command = /^(listcanvas|savecanvas|getcanvas|deletecanvas|dc)$/i
handler.owner = true

export default handler
