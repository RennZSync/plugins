import axios from 'axios'
import AdmZip from 'adm-zip'

// ⚠️ Isi token Vercel kamu di sini
const VERCEL_TOKEN = ' ' // isi sendiri

let handler = async (m, { conn, usedPrefix, command, args }) => {
  const name = args[0]
  if (!name) {
    return m.reply(
`🚀 *DEPLOY*

> Masukkan nama website
> Reply kode HTML, file .html, atau file .zip

Contoh:
${usedPrefix + command} mysite`
    )
  }

  if (!m.quoted) {
    return m.reply(
`❌ *KONTEN TIDAK DITEMUKAN*

> Reply pesan berisi HTML
> atau reply file .html / .zip`
    )
  }

  if (!VERCEL_TOKEN) {
    return m.reply('❌ *Vercel token belum diisi di plugin*')
  }

  await m.react('🚀')

  let files = []

  try {
    const isZip =
      m.quoted.mimetype === 'application/zip' ||
      m.quoted.mimetype === 'application/x-zip-compressed' ||
      (m.quoted.filename && m.quoted.filename.endsWith('.zip'))

    const isHtmlFile =
      m.quoted.mimetype === 'text/html' ||
      (m.quoted.filename && m.quoted.filename.endsWith('.html'))

    if (isZip) {
      const buffer = await m.quoted.download()
      const zip = new AdmZip(buffer)
      const entries = zip.getEntries()

      if (!entries.length) {
        await m.react('❌')
        return m.reply('❌ *ZIP kosong*')
      }

      const skipDirs = ['node_modules/', '.git/', '__MACOSX/']

      for (const entry of entries) {
        if (entry.isDirectory) continue
        if (skipDirs.some(d => entry.entryName.startsWith(d))) continue

        const isBinary = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|mp4|mp3)$/i.test(entry.entryName)
        const data = entry.getData()

        files.push({
          file: entry.entryName.replace(/^\/+/, ''),
          data: isBinary ? data.toString('base64') : data.toString('utf8'),
          encoding: isBinary ? 'base64' : undefined
        })
      }

      const hasIndex = files.some(f => f.file === 'index.html')
      if (!hasIndex) {
        await m.react('❌')
        return m.reply(
`❌ *index.html TIDAK DITEMUKAN*

> ZIP harus punya index.html di root`
        )
      }

    } else if (isHtmlFile) {
      const buffer = await m.quoted.download()
      files.push({ file: 'index.html', data: buffer.toString('utf8') })

    } else if (m.quoted.text) {
      const htmlContent = m.quoted.text

      if (!/<html|<!doctype html|<head|<body/i.test(htmlContent)) {
        await m.react('❌')
        return m.reply(
`❌ *BUKAN HTML VALID*

> Pastikan berisi struktur HTML`
        )
      }

      files.push({ file: 'index.html', data: htmlContent })

    } else {
      await m.react('❌')
      return m.reply(
`❌ *FORMAT TIDAK DIDUKUNG*

> Reply teks HTML, file .html, atau file .zip`
      )
    }

    const payload = {
      name,
      project: name,
      target: 'production',
      files,
      projectSettings: {
        framework: null
      }
    }

    await axios.post(
      'https://api.vercel.com/v13/deployments',
      payload,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    )

    let domain = `${name}.vercel.app`

    try {
      const domainsRes = await axios.get(
        `https://api.vercel.com/v9/projects/${name}/domains`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, timeout: 30000 }
      )
      const domains = domainsRes.data.domains || []
      domain =
        domains.find(d => !d.name.endsWith('.vercel.app'))?.name ||
        domains.find(d => d.name.endsWith('.vercel.app'))?.name ||
        domain
    } catch {}

    await m.react('✅')

    await conn.sendMessage(
      m.chat,
      {
        text:
`╭──「 *DEPLOY SUCCESS* 」
│
│ 🌐 Nama     : ${name}
│ ☁️ Platform : Vercel
│ 📄 Type     : ${files.length > 1 ? `ZIP (${files.length} files)` : 'Static HTML'}
│ ⚙️ Status   : Building
│
│ 🔗 URL
│ https://${domain}
│
╰────────────────`
      },
      { quoted: m }
    )

  } catch (error) {
    await m.react('❌')

    const err =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message

    await conn.sendMessage(
      m.chat,
      {
        text:
`╭──「 *DEPLOY FAILED* 」
│
│ ❌ ${err}
│
╰────────────────`
      },
      { quoted: m }
    )
  }
}

handler.help = ['deploy <namawebsite>']
handler.tags = ['owner']
handler.command = /^(deploy|vercel)$/i
handler.owner = true

export default handler
