/* 
plugin by hilman
developer ryo yamada 
*/

import os from 'os'
import fs from 'fs'
import { execSync } from 'child_process'

let handler = async (m, { conn }) => {
  const start = Date.now()

  const { A2UI, sendA2UIWidget } = await import(
    '../../lib/ui/a2ui.js?date=' + Date.now()
  )

  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memPercent = ((usedMem / totalMem) * 100).toFixed(1)

  const processMem = process.memoryUsage()

  let disk = '-'
  try {
    disk = execSync('df -h / | tail -1')
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
  } catch {}

  let distro = '-'
  try {
    const release = fs.readFileSync('/etc/os-release', 'utf8')
    distro = release.match(/^PRETTY_NAME="(.+)"$/m)?.[1] || '-'
  } catch {}

  const ui = new A2UI()

  const thumbnail = ui.image(
    'https://raw.githubusercontent.com/RennZSync/uploaders/main/anu/1790585777057-60027c4b.jpg',
    { variant: 'header' }
  )

  const title = ui.text('Server Information', {
    variant: 'h1'
  })

  const statusCard = ui.card(
    ui.column([
      ui.text('Bot Status', { variant: 'h2' }),

      ui.text(
        `Running On: ${
          process.env.USER === 'root'
            ? 'VPS'
            : 'HOSTING (PANEL)'
        }`
      ),

      ui.text(
        `Bot Speed: ${Date.now() - start} ms`
      ),

      ui.text(
        `Bot Uptime: ${toTime(process.uptime() * 1000)}`,
        { variant: 'caption' }
      ),

      ui.text(
        `Server Uptime: ${toTime(os.uptime() * 1000)}`,
        { variant: 'caption' }
      )
    ])
  )

  const systemCard = ui.card(
    ui.column([
      ui.text('System', { variant: 'h2' }),

      ui.text(`Distro: ${distro}`),
      ui.text(`Platform: ${os.platform()}`),
      ui.text(`Type: ${os.type()}`),
      ui.text(`Release: ${os.release()}`),
      ui.text(`Architecture: ${os.arch()}`),
      ui.text(`Hostname: ${os.hostname()}`),
      ui.text(`Node.js: ${process.version}`),
      ui.text(`PID: ${process.pid}`)
    ])
  )

  const cpuCard = ui.card(
    ui.column([
      ui.text('CPU', { variant: 'h2' }),

      ui.text(`Model: ${os.cpus()[0].model}`),
      ui.text(`Cores: ${os.cpus().length}`),
      ui.text(`Speed: ${os.cpus()[0].speed} MHz`),

      ui.text(
        `Load Average: ${os.loadavg()
          .map(v => v.toFixed(2))
          .join(' | ')}`,
        { variant: 'caption' }
      )
    ])
  )

  const memoryCard = ui.card(
    ui.column([
      ui.text('Memory', { variant: 'h2' }),

      ui.text(`Used: ${formatSize(usedMem)}`),
      ui.text(`Free: ${formatSize(freeMem)}`),
      ui.text(`Total: ${formatSize(totalMem)}`),

      ui.text(
        `Usage: ${memPercent}%`,
        { variant: 'caption' }
      )
    ])
  )

  const processCard = ui.card(
    ui.column([
      ui.text('Process Memory', { variant: 'h2' }),

      ui.text(`RSS: ${formatSize(processMem.rss)}`),
      ui.text(`Heap Total: ${formatSize(processMem.heapTotal)}`),
      ui.text(`Heap Used: ${formatSize(processMem.heapUsed)}`),
      ui.text(`External: ${formatSize(processMem.external)}`),
      ui.text(`Array Buffers: ${formatSize(processMem.arrayBuffers)}`)
    ])
  )

  const runtimeCard = ui.card(
    ui.column([
      ui.text('Runtime', { variant: 'h2' }),

      ui.text(`V8: ${process.versions.v8}`),
      ui.text(`OpenSSL: ${process.versions.openssl}`),
      ui.text(`UV: ${process.versions.uv}`),
      ui.text(`Zlib: ${process.versions.zlib}`),
      ui.text(`ICU: ${process.versions.icu}`),

      ui.text(
        `Environment: ${process.env.NODE_ENV || 'production'}`,
        { variant: 'caption' }
      )
    ])
  )

  const storageCard = ui.card(
    ui.column([
      ui.text('Storage', { variant: 'h2' }),

      ui.text(
        `Disk: ${disk}`,
        { variant: 'caption' }
      ),

      ui.text(
        `Tmp Files: ${fs.readdirSync(os.tmpdir()).length}`,
        { variant: 'caption' }
      )
    ])
  )

  ui.root([
    thumbnail,
    title,
    statusCard,
    systemCard,
    cpuCard,
    memoryCard,
    processCard,
    runtimeCard,
    storageCard
  ])

  await sendA2UIWidget(conn, m.chat, {
    footer: `Ryo Yamada MD • ${Date.now() - start} ms`,

    a2ui: ui,

    contextInfo: {
      expiration: 7776000
    },

    singleScreen: true
  })
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = /^(ping|speed|os)$/i

export default handler


function toTime(ms) {
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)

  return [
    d ? `${d}d` : '',
    h ? `${h}h` : '',
    m ? `${m}m` : '',
    `${s}s`
  ].filter(Boolean).join(' ')
}


function formatSize(bytes) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let i = 0

  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }

  return `${bytes.toFixed(2)} ${units[i]}`
}
