/*
by RennZSync 
ch: https://whatsapp.com/channel/0029VbCJ0B0K0IBlYlYJ0W3c
hapus wm ga rispek banget wok
yaudah sih gitu aja
*/

import { AIRich } from '../../lib/ui/MessageBuilder.js'; //sesuaikan path

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const jsString = (s) =>
  JSON.stringify(String(s)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

const buildHtml = (message, seconds) => `
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-user-select:none}
body{background:#0A0A0F;display:flex;justify-content:center;align-items:center;min-height:100vh;color:#fff}
.container{width:100%;max-width:420px;padding:20px}
.card{background:linear-gradient(145deg,#1a1a2e,#16213e);border:2px solid #2A2A35;border-radius:28px;padding:30px 20px;text-align:center;box-shadow:0 0 30px rgba(0,140,255,.15)}
.icon{font-size:48px;margin-bottom:10px}
.title{font-size:22px;font-weight:700;margin-bottom:6px}
.msg{font-size:16px;color:#aab;margin:12px 0}
.timer{font-size:14px;color:#00A2FF;font-weight:600;margin:6px 0}
.footer{font-size:12px;color:#666;margin-top:16px;border-top:1px solid #2a2a35;padding-top:12px}
</style>
<div class="container">
<div class="card">
<div class="icon">🔔</div>
<div class="title">Reminder Aktif</div>
<div class="msg">${escapeHtml(message)}</div>
<div class="timer" id="timerDisplay">⏱️ Sisa: ${seconds}s</div>
<div class="footer">Alert akan berhenti otomatis setelah waktu habis</div>
</div>
</div>
<script>
(function(){
const msg = ${jsString(message)};
const totalSeconds = ${seconds};
const interval = 800;
let remaining = totalSeconds;
const timerEl = document.getElementById('timerDisplay');

function updateTimer() {
  if (remaining <= 0) { timerEl.textContent = '✅ Selesai!'; return; }
  let sec = remaining, txt = '';
  if (sec >= 86400) { txt = Math.floor(sec/86400)+'d '; sec %= 86400; }
  if (sec >= 3600) { txt += Math.floor(sec/3600)+'h '; sec %= 3600; }
  if (sec >= 60) { txt += Math.floor(sec/60)+'m '; sec %= 60; }
  txt += sec+'s';
  timerEl.textContent = '⏱️ Sisa: '+txt;
}
updateTimer();

const alertInterval = setInterval(function() {
  if (remaining <= 0) { clearInterval(alertInterval); timerEl.textContent = '✅ Selesai!'; return; }
  alert(msg);
  remaining--;
  updateTimer();
}, interval);

setTimeout(function() {
  clearInterval(alertInterval);
  remaining = 0;
  updateTimer();
}, totalSeconds * 1000);
})();
</script>
`;

let handler = async (m, { text, conn }) => {
  if (!text) return m.reply('Contoh: .alert 10s Halo semua!');

  const [durationStr, ...rest] = text.trim().split(/\s+/);
  const message = rest.join(' ') || '⏰ Reminder!';

  const match = durationStr.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return m.reply('Format durasi salah. Gunakan: .alert 10s Pesan');

  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[match[2].toLowerCase()];
  const seconds = parseInt(match[1]) * mult;
  if (seconds <= 0) return m.reply('Durasi harus lebih dari 0');

  const rich = new AIRich(conn).setTitle('');

  rich._addContent(
    AIRich.newLayout('Single', {
      __typename: 'GenAIaeacdsnwHtmlPrimitive',
      payload: buildHtml(message, seconds),
      trusted_sources: ['apdev.dev'],
    }),
    { messageType: 2, messageText: '🔔 Reminder' }
  );

  await rich.send(m.chat);
};

handler.help = ['alert <duration> <message>'];
handler.tags = ['tools'];
handler.command = /^(alert)$/i;

export default handler;
