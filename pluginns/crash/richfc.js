import {
  AIRich
} from '../../lib/ui/MessageBuilder.js'

function parseDuration(input) {
  if (!input) return 60000 // 1 menit default

  const match = input.match(/^(\d+)\s*(s|m|menit|detik)?$/i)
  if (!match) return null

  const value = parseInt(match[1])
  const unit = (match[2] || 'm').toLowerCase()

  if (unit === 's' || unit === 'detik') return value * 1000
  if (unit === 'm' || unit === 'menit') return value * 60000

  return value * 60000
}

let handler = async (m, {
  conn,
  args,
  usedPrefix,
  command
}) => {
  const durationMs = parseDuration(args[0])

  if (durationMs === null) {
    return m.reply(`Format durasi salah!\n\nContoh penggunaan:\n• *${usedPrefix + command} 1m*\n• *${usedPrefix + command} 1menit*\n• *${usedPrefix + command} 30s*`)
  }
  const rich = new AIRich(conn).addSection(
    AIRich.newLayout('Single', {
      __typename: 'GenAIBotProgressStatusPrimitive',
      icon: null,
      is_in_progress: true,
      meta_search_apps: null,
      target_secondary_screen_id: null,
      target_secondary_screen_tab_id: null,
      title: 'broo sedang berfikir... 1/10',
    }), {
      id: 'progress'
    }
  )

  await rich.send(m.chat)
  const sequence = [5, 6, 7, 8, 9]
  let seqIndex = 0
  const startTime = Date.now()
  const intervalMs = 1200

  while (Date.now() - startTime < durationMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    if (Date.now() - startTime >= durationMs) break

    const currentStep = sequence[seqIndex % sequence.length]
    seqIndex++
    rich.addSection(
      AIRich.newLayout('Single', {
        __typename: 'GenAIBotProgressStatusPrimitive',
        icon: null,
        is_in_progress: true,
        meta_search_apps: null,
        target_secondary_screen_id: null,
        target_secondary_screen_tab_id: null,
        title: `RennZSync crashed ${currentStep}/10`,
      }), {
        replace: 'progress'
      }
    )

    await rich.sendEdit()
  }

  rich.addSection(
    AIRich.newLayout('Single', {
      __typename: 'GenAIBotProgressStatusPrimitive',
      icon: null,
      is_in_progress: false,
      meta_search_apps: null,
      target_secondary_screen_id: null,
      target_secondary_screen_tab_id: null,
      title: 'RennZSync crashed 10/10',
    }), {
      replace: 'progress'
    }
  )

  await rich.sendEdit()
}

handler.help = ['richfc <durasi>']
handler.tags = ['crash']
handler.command = /^(richfc)$/i
handler.owner = true
export default handler
