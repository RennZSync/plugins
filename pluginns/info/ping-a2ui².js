import os from 'os'
import fs from 'fs'
import crypto from 'crypto'
import {
  execSync
} from 'child_process'

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0,
    v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

function durasi(ms) {
  const t = Math.floor(ms / 1000)
  const d = Math.floor(t / 86400)
  const h = Math.floor((t % 86400) / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return [
    ...(d ? [`${d} hari`] : []),
    ...(h ? [`${h} jam`] : []),
    ...(m ? [`${m} menit`] : []),
    `${s} detik`,
  ].join(', ')
}

function getUsername() {
  try {
    return os.userInfo().username
  } catch {
    return '-'
  }
}

function getDisk() {
  try {
    const out = execSync('df -kP /', {
      timeout: 3000
    }).toString().trim().split('\n')
    const row = out.slice(1).map(l => l.trim().split(/\s+/))[0]
    const total = +row[1] * 1024
    const used = +row[2] * 1024
    return {
      total,
      used,
      percent: +(used / total * 100).toFixed(1)
    }
  } catch {
    return null
  }
}

function getSwap() {
  try {
    const f = fs.readFileSync('/proc/meminfo', 'utf8')
    const total = ((f.match(/^SwapTotal:\s+(\d+)/) || [0, 0])[1]) * 1024
    const free = ((f.match(/^SwapFree:\s+(\d+)/) || [0, 0])[1]) * 1024
    if (!total) return null
    const used = total - free
    return {
      total,
      used,
      free,
      percent: +(used / total * 100).toFixed(1)
    }
  } catch {
    return null
  }
}

function getNetwork() {
  const ni = os.networkInterfaces()
  const list = []
  let primary = ''
  for (const [name, addrs] of Object.entries(ni)) {
    for (const a of addrs || []) {
      if (a.internal) continue
      list.push(`${name} · ${a.address}`)
      if (!primary && a.family === 'IPv4') primary = a.address
    }
  }
  return {
    list: list.slice(0, 6),
    count: Object.keys(ni).filter(k => (ni[k] || []).some(a => !a.internal)).length,
    primary: primary || list[0]?.split(' · ')[1] || '-',
  }
}

function buildSurface(d) {
  const comps = []
  const rootKids = []
  const ctr = {}

  const T = (id, text, variant = 'body') =>
    comps.push({
      component: 'Text',
      id,
      text: String(text),
      variant
    })

  const SL = (id, label, value) =>
    comps.push({
      component: 'Slider',
      id,
      label,
      max: 100,
      min: 0,
      value
    })

  function card(id, title, items) {
    const contentId = `${id}_content`
    const kids = [`${id}_title`, `${id}_divider`]
    comps.push({
      component: 'Card',
      id,
      child: contentId
    })
    for (const it of items) {
      const kidId = `${id}_${ctr[id] = (ctr[id] || 0) + 1}`
      if (it.slider) SL(kidId, it.label, it.value)
      else T(kidId, it.text, it.variant || 'body')
      kids.push(kidId)
    }
    comps.push({
      component: 'Column',
      id: contentId,
      children: kids
    })
    T(`${id}_title`, title, 'h2')
    comps.push({
      component: 'Divider',
      id: `${id}_divider`
    })
  }

  rootKids.push('hero')
  comps.push({
    component: 'Card',
    id: 'hero',
    child: 'hero_content'
  })
  comps.push({
    component: 'Column',
    id: 'hero_content',
    children: ['hero_title', 'hero_subtitle', 'hero_status'],
  })
  T('hero_title', 'Server Inspector', 'h1')
  T('hero_subtitle', 'Live operating system information', 'caption')
  T('hero_status', `● ${d.botName}`)

  rootKids.push('system')
  card('system', 'System Information', [{
      text: `OS · ${d.osType}`
    },
    {
      text: `Kernel · ${d.kernel}`
    },
    {
      text: `Architecture · ${d.arch}`
    },
    {
      text: `CPU · ${d.cpuShort}`
    },
    {
      text: `CPU Cores · ${d.cores}`
    },
    {
      text: `Hostname · ${d.hostname}`
    },
    {
      text: `User · ${d.username}`
    },
    {
      text: `Endianness · ${d.endianness}`
    },
  ])

  rootKids.push('resources')
  const resItems = [{
      slider: true,
      label: `CPU · ${d.cpuPercent}%`,
      value: d.cpuPercent
    },
    {
      slider: true,
      label: `RAM · ${d.memPercent}%`,
      value: d.memPercent
    },
  ]
  if (d.disk) resItems.push({
    slider: true,
    label: `SSD Storage · ${d.disk.percent}%`,
    value: d.disk.percent
  })
  resItems.push({
    variant: 'caption',
    text: [
      `CPU Load · ${d.load1} · ${d.load5} · ${d.load15}`,
      `RAM · ${d.memUsed} / ${d.memTotal}`,
      ...(d.disk ? [`SSD · ${formatSize(d.disk.used)} / ${formatSize(d.disk.total)}`] : []),
    ].join('\n'),
  })
  card('resources', 'System Resources', resItems)

  rootKids.push('node_memory')
  card('node_memory', 'Node.js Memory', [{
      text: `RSS · ${d.rss}`
    },
    {
      text: `Heap Total · ${d.heapTotal}`
    },
    {
      text: `Heap Used · ${d.heapUsed}`
    },
    {
      text: `External · ${d.external}`
    },
    {
      text: `ArrayBuffers · ${d.arrayBuffers}`
    },
  ])

  if (d.swap) {
    rootKids.push('swap')
    card('swap', 'Swap Memory', [{
        slider: true,
        label: `Swap Usage · ${d.swap.percent}%`,
        value: d.swap.percent
      },
      {
        text: `Total · ${formatSize(d.swap.total)}`
      },
      {
        text: `Used · ${formatSize(d.swap.used)}`
      },
      {
        text: `Free · ${formatSize(d.swap.free)}`
      },
    ])
  }

  rootKids.push('network')
  card('network', 'Network', [{
      text: `Primary IP · ${d.netPrimary}`
    },
    {
      text: `Interfaces · ${d.netCount}`
    },
    {
      variant: 'caption',
      text: d.netList
    },
  ])


  rootKids.push('runtime')
  card('runtime', 'Runtime', [{
      text: `Runtime · ${d.runtimeName}`
    },
    {
      text: `${d.runtimeName} Version · ${d.runtimeVersion}`
    },
    {
      text: `Node Compatibility · ${d.nodeCompat}`
    },
    {
      text: `JavaScript Engine · ${d.engine}`
    },
    {
      text: `PID · ${d.pid}`
    },
    {
      text: `Bot Uptime · ${d.botUptime}`
    },
    {
      text: `System Uptime · ${d.sysUptime}`
    },
    {
      variant: 'caption',
      text: `Executable · ${d.executable}`
    },
  ])

  comps.unshift({
    component: 'Column',
    id: 'root',
    children: rootKids
  })

  return {
    createSurface: {
      catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
      components: comps,
      surfaceId: `ping-os=${Date.now()}`,
    },
    version: 'v0.9',
  }
}

let handler = async (m, {
  conn
}) => {
  const start = Date.now()
  await m.react('🍡')

  const cores = os.cpus().length
  const load = os.loadavg()
  const totalMem = os.totalmem(),
    freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const heap = process.memoryUsage()
  const isBun = typeof Bun !== 'undefined'
  const net = getNetwork()

  const d = {
    botName: conn?.user?.name || String(conn?.user?.id || '').split('@')[0] || 'WhatsApp Bot',
    speed: Date.now() - start,
    osType: `${os.type()} ${os.release()}`,
    kernel: os.release(),
    arch: os.arch(),
    cpuShort: (os.cpus()[0]?.model || 'Unknown').replace(/\(R\)|\(TM\)/g, '').trim(),
    cores,
    hostname: os.hostname(),
    username: getUsername(),
    endianness: os.endianness(),
    cpuPercent: +Math.min(99.9, (load[0] / Math.max(cores, 1)) * 100).toFixed(1),
    load1: load[0].toFixed(2),
    load5: load[1].toFixed(2),
    load15: load[2].toFixed(2),
    memPercent: +((usedMem / totalMem) * 100).toFixed(1),
    memUsed: formatSize(usedMem),
    memTotal: formatSize(totalMem),
    rss: formatSize(heap.rss),
    heapTotal: formatSize(heap.heapTotal),
    heapUsed: formatSize(heap.heapUsed),
    external: formatSize(heap.external),
    arrayBuffers: formatSize(heap.arrayBuffers ?? 0),
    disk: getDisk(),
    swap: getSwap(),
    netPrimary: net.primary,
    netCount: net.count,
    netList: net.list.join('\n') || '-',
    runtimeName: isBun ? 'Bun' : 'Node.js',
    runtimeVersion: isBun ? Bun.version : process.version,
    nodeCompat: `v${process.versions.node}`,
    engine: isBun ? 'JavaScriptCore' : `V8 ${process.versions.v8}`,
    pid: process.pid,
    botUptime: durasi(process.uptime() * 1000),
    sysUptime: durasi(os.uptime() * 1000),
    executable: process.execPath || '-',
  }

  const surface = buildSurface(d)

  const fallbackText =
    `🔍 *PONG!* • ${d.speed}ms\n\n` +
    `💻 ${d.cpuShort} • ${d.cores} threads\n` +
    `🧠 RAM: ${d.memPercent}% (${d.memUsed} / ${d.memTotal})\n` +
    `📦 ${d.runtimeName} ${d.runtimeVersion} • Heap ${d.heapUsed}\n` +
    (d.disk ? `🗄️ Disk: ${d.disk.percent}% (${formatSize(d.disk.used)} / ${formatSize(d.disk.total)})\n` : '') +
    `⏱️ Uptime: ${d.botUptime}`

  try {
    const msg = {
      messageContextInfo: {
        threadId: [],
        messageSecret: new Uint8Array(crypto.randomBytes(32)),
      },
      interactiveMessage: {
        body: {
          text: ''
        },
        bloksWidget: {
          uuid: crypto.randomUUID(),
          data: JSON.stringify(surface),
          type: 'im_a2ui',
        },
        contextInfo: {},
        nativeFlowMessage: {
          buttons: [{
            name: ''
          }],
          messageParamsJson: '{}',
        },
      },
    }

    await conn.relayMessage(m.chat, msg, {
      additionalNodes: [{
        tag: 'biz',
        attrs: {}
      }],
    })
  } catch (e) {
    console.error('[PING A2UI ERROR]', e)
    m.reply(fallbackText)
  }
}

handler.help = ['ping2', 'speed2']
handler.tags = ['info']
handler.command = ['ping2', 'speed2']

export default handler
