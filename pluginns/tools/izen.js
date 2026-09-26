let handler = async (m, { args, command }) => {
  try {
    if (!args[0]) return m.reply(`*Example :* .${command} https://sfl.gl/xxxxx`)

    m.reply(global.wait)

    m.reply(
      (
        await (
          await fetch(`https://anabot.my.id/api/tools/izenLOL?url=${encodeURIComponent(args[0])}&apikey=freeApikey`)
        ).json()
      ).data.result.result
    )
  } catch (e) {
    m.reply(e.message)
  }
}

handler.help = ['izen']
handler.command = ['izen']
handler.tags = ['tools']

export default handler
