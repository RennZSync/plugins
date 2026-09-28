import { execFile as _execFile } from "child_process";
import { promisify } from "util";

const execFile = promisify(_execFile);

const handler = async (m, { conn }) => {
  await m.react("⏳") 

  try {
    const { stdout, stderr } = await execFile("python3", [ "lib/utils/speed.py", "--share", "--secure"]);
    
    await m.react("") 

    if (stdout?.trim()) {
      let { link, text } = parseSpeedtest(stdout.trim()) 
      new Button(conn) 
        .setImage(link) 
        .setTitle("Speedtest - NET") 
        .setBody(text) 
        .setFooter(namebot) 
        .addUrl("Result Link", link) 
        .addCopy("Copy Link", link) 
        .send(m.chat, { quoted: m }) 
    }

    if (stderr?.toLowerCase().includes("error")) {
      m.reply(stderr);
    }

  } catch (err) {
    m.reply(err.message || String(err));
  }
}; 

handler.help = ["speedtest"];
handler.tags = ["info"];
handler.command = /^(speedtest|ookla)$/i;

export default handler;

function parseSpeedtest(text) {
  const match = text.match(/https?:\/\/www\.speedtest\.net\/result\/\d+\.png/);
  const link = match?.[0] ?? null;
  const cleaned = text
    .replace(/Share results:\s*https?:\/\/www\.speedtest\.net\/result\/\d+\.png\s*/i, "")
    .trim();
  return {
    link,
    text: cleaned
  };
}
