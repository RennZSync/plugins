import { randomBytes } from 'crypto';

function formatRuntime(seconds) {
    seconds = Number(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

let handler = async (m, { conn }) => {
    let uptimeSeconds = process.uptime();
    let time = formatRuntime(uptimeSeconds);
    
    const customId = () => 'A5' + randomBytes(15).toString('hex').toUpperCase();

    await conn.relayMessage(
      m.chat,
      {
        interactiveResponseMessage: {
          body: {
            text: '\0', 
            format: 1
          },
          nativeFlowResponseMessage: {
            name: 'galaxy_message',
            paramsJson: JSON.stringify({
              wa_flow_response_params: {
                title: `⌛ ${time}` 
              }
            }),
            version: 3
          }
        }
      },
      { quoted: m, messageId: customId() }
    );
};

handler.help = ['runtime', 'uptime'];
handler.tags = ['info'];
handler.command = /^(runtime|uptime|rt)$/i;
handler.limit = true;
handler.register = true;

export default handler;
