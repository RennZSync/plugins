import { searchYoutube, getYoutubeDirectUrl } from '../../lib/scraper/youtube.js';
import { AIRich, Typenames } from '../../lib/ui/MessageBuilder.js';
import axios from 'axios';

function escapeHtmlJs(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/</g, '\\x3C');
}

function buildPlayerHtml({ title, channel, duration, videoUrl, wsUrl, posterBase64 }) {
  const safeTitle = escapeHtmlJs(title);
  const safeChannel = escapeHtmlJs(channel);
  const safeDuration = escapeHtmlJs(duration);
  const safeVideoUrl = escapeHtmlJs(videoUrl);
  const safeWsUrl = escapeHtmlJs(wsUrl);

  return `<style>
*{
-webkit-tap-highlight-color:transparent;
-webkit-user-select:none;
user-select:none;
-webkit-touch-callout:none;
box-sizing:border-box
}
body{
margin:0;
background:#090a0f;
font-family:Arial,Helvetica,sans-serif;
color:#fff;
touch-action:manipulation;
cursor:pointer
}
input[type=range]{
width:100%;
height:4px;
accent-color:#fff;
cursor:pointer
}
.player-wrap{
width:100%;
max-width:440px;
margin:auto;
padding:12px
}
.player{
position:relative;
overflow:hidden;
background:#111318;
border:1px solid rgba(255,255,255,.12);
border-radius:20px;
box-shadow:0 10px 40px rgba(0,0,0,.55)
}
.bg{
position:absolute;
inset:-25px;
background-position:center;
background-size:cover;
filter:blur(22px);
opacity:.38;
transform:scale(1.15);
pointer-events:none
}
.bg-overlay{
position:absolute;
inset:0;
background:linear-gradient(
180deg,
rgba(5,6,10,.35),
rgba(5,6,10,.72)
);
pointer-events:none
}
.content{
position:relative;
padding:18px;
z-index:2
}
.top{
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:15px
}
.top-title{
font-size:13px;
font-weight:700;
letter-spacing:.8px;
opacity:.85
}
.top-sub{
font-size:10px;
opacity:.5;
margin-top:3px;
white-space:nowrap;
overflow:hidden;
text-overflow:ellipsis;
max-width:260px
}
.icon-btn{
width:34px;
height:34px;
border:0;
border-radius:50%;
background:rgba(255,255,255,.08);
color:#fff;
display:flex;
align-items:center;
justify-content:center;
padding:0;
flex-shrink:0
}
.icon-btn svg{
width:17px;
height:17px;
fill:none;
stroke:currentColor;
stroke-width:2;
stroke-linecap:round;
stroke-linejoin:round
}
.video-frame{
position:relative;
width:100%;
aspect-ratio:16/9;
border-radius:15px;
overflow:hidden;
background:#000;
box-shadow:0 12px 35px rgba(0,0,0,.45);
cursor:pointer
}
.video-frame video{
width:100%;
height:100%;
display:block;
background:#000;
object-fit:contain
}
.big-play{
position:absolute;
inset:0;
display:flex;
align-items:center;
justify-content:center;
background:rgba(0,0,0,.18);
transition:opacity .2s;
z-index:3
}
.big-btn{
width:64px;
height:64px;
border:0;
border-radius:50%;
background:#fff;
color:#08090d;
display:flex;
align-items:center;
justify-content:center;
padding:0;
box-shadow:0 6px 18px rgba(0,0,0,.35)
}
.big-btn svg{
width:26px;
height:26px;
fill:currentColor;
stroke:currentColor;
stroke-width:2;
stroke-linecap:round;
stroke-linejoin:round
}
.frame-playing .big-play{
opacity:0;
pointer-events:none
}
.info{
padding-top:15px
}
.song-title{
font-size:19px;
font-weight:700;
white-space:nowrap;
overflow:hidden;
text-overflow:ellipsis
}
.artist{
font-size:13px;
opacity:.6;
margin-top:5px;
white-space:nowrap;
overflow:hidden;
text-overflow:ellipsis
}
.progress{
margin-top:18px
}
.times{
display:flex;
justify-content:space-between;
font-size:10px;
opacity:.55;
margin-top:7px
}
.controls{
display:flex;
align-items:center;
justify-content:center;
gap:18px;
margin-top:13px
}
.side-btn{
width:38px;
height:38px;
border:0;
background:transparent;
color:#fff;
display:flex;
align-items:center;
justify-content:center;
padding:0;
opacity:.8
}
.side-btn svg{
width:19px;
height:19px;
fill:none;
stroke:currentColor;
stroke-width:2;
stroke-linecap:round;
stroke-linejoin:round
}
.bottom{
display:flex;
align-items:center;
justify-content:space-between;
margin-top:15px;
gap:12px
}
.bottom-left,
.bottom-right{
display:flex;
align-items:center;
gap:9px
}
.volume{
width:85px
}
.debug-wrap{
margin-top:12px;
background:#111318;
border:1px solid rgba(255,255,255,.12);
border-radius:16px;
padding:12px;
font-family:monospace
}
.debug-head{
display:flex;
align-items:center;
justify-content:space-between;
margin-bottom:8px
}
.debug-title{
font-size:11px;
font-weight:700;
letter-spacing:.8px;
opacity:.85
}
.debug-state{
font-size:10px;
font-weight:700;
padding:3px 8px;
border-radius:20px;
background:rgba(255,255,255,.08);
color:#ffd166;
letter-spacing:.5px
}
.debug-server{
font-size:9px;
opacity:.5;
word-break:break-all;
margin-bottom:8px;
line-height:1.4
}
.debug-grid{
display:grid;
grid-template-columns:repeat(3,1fr);
gap:6px;
margin-bottom:8px
}
.debug-cell{
background:rgba(255,255,255,.05);
border-radius:8px;
padding:6px 8px
}
.debug-cell span{
display:block;
font-size:8px;
opacity:.5;
letter-spacing:.5px
}
.debug-cell b{
display:block;
font-size:11px;
margin-top:2px;
white-space:nowrap;
overflow:hidden;
text-overflow:ellipsis
}
.debug-bar{
height:4px;
border-radius:4px;
background:rgba(255,255,255,.08);
overflow:hidden;
margin-bottom:8px
}
.debug-bar-fill{
height:100%;
width:0;
background:linear-gradient(90deg,#4cc9f0,#7bff9f);
transition:width .3s
}
.debug-log{
height:110px;
overflow-y:auto;
background:rgba(0,0,0,.35);
border-radius:8px;
padding:6px 8px;
font-size:9px;
line-height:1.6;
color:rgba(255,255,255,.75);
word-break:break-all;
-webkit-overflow-scrolling:touch
}
.log-line{
white-space:pre-wrap
}
</style>

<body>
<div class="player-wrap">
<div class="player">
<div class="bg" id="background"></div>
<div class="bg-overlay"></div>
<div class="content">
<div class="top">
<div>
<div class="top-title" id="playlistTitle">NOW PLAYING VIDEO</div>
<div class="top-sub" id="playlistSub">${safeTitle}</div>
</div>
<button class="icon-btn" type="button" onclick="toggleMute()" id="muteButton">
<svg id="volumeIcon" viewBox="0 0 24 24">
<path d="M11 5 6 9H2v6h4l5 4V5z"></path>
<path d="M19 9a5 5 0 0 1 0 6"></path>
<path d="M16 6.5a9 9 0 0 1 0 11"></path>
</svg>
</button>
</div>

<div class="video-frame" id="videoFrame" onclick="toggleVideo()">
<video id="videoPlayer" playsinline webkit-playsinline preload="none" poster="${posterBase64}"></video>
<div class="big-play" id="bigPlay">
<button class="big-btn" type="button" onclick="event.stopPropagation();toggleVideo()">
<svg id="playIcon" viewBox="0 0 24 24">
<path d="M8 5v14l11-7z"></path>
</svg>
<svg id="pauseIcon" viewBox="0 0 24 24" style="display:none">
<path d="M7 5v14"></path>
<path d="M17 5v14"></path>
</svg>
</button>
</div>
</div>

<div class="info">
<div class="song-title" id="songTitle">Unknown Video</div>
<div class="artist" id="artist">Unknown Channel</div>
</div>

<div class="progress">
<input id="progress" type="range" min="0" max="100" value="0" step="0.1" oninput="seekVideo(this.value)">
<div class="times">
<span id="currentTime">0:00</span>
<span id="duration">0:00</span>
</div>
</div>

<div class="controls">
<button class="side-btn" type="button" onclick="previousVideo()">
<svg viewBox="0 0 24 24">
<path d="M19 20 9 12l10-8v16z"></path>
<path d="M5 19V5"></path>
</svg>
</button>
<button class="side-btn" type="button" onclick="toggleVideo()">
<svg id="smallPlayIcon" viewBox="0 0 24 24">
<path d="M8 5v14l11-7z"></path>
</svg>
<svg id="smallPauseIcon" viewBox="0 0 24 24" style="display:none">
<path d="M7 5v14"></path>
<path d="M17 5v14"></path>
</svg>
</button>
<button class="side-btn" type="button" onclick="nextVideo()">
<svg viewBox="0 0 24 24">
<path d="m5 4 10 8-10 8V4z"></path>
<path d="M19 5v14"></path>
</svg>
</button>
</div>

<div class="bottom">
<div class="bottom-left">
<button class="icon-btn" type="button" onclick="toggleRepeat()" id="repeatButton">
<svg viewBox="0 0 24 24">
<path d="M17 2l4 4-4 4"></path>
<path d="M3 11V9a3 3 0 0 1 3-3h15"></path>
<path d="m7 22-4-4 4-4"></path>
<path d="M21 13v2a3 3 0 0 1-3 3H3"></path>
</svg>
</button>
</div>
<div class="bottom-right">
<button class="icon-btn" type="button" onclick="toggleMute()">
<svg viewBox="0 0 24 24">
<path d="M11 5 6 9H2v6h4l5 4V5z"></path>
<path d="m19 9-5 6"></path>
<path d="m14 9 5 6"></path>
</svg>
</button>
<input class="volume" id="volume" type="range" min="0" max="1" step="0.01" value="1" oninput="changeVolume(this.value)">
</div>
</div>
</div>
</div>

<div class="debug-wrap">
<div class="debug-head">
<div class="debug-title">WEBSOCKET VIDEO</div>
<div class="debug-state" id="wsState">CONNECTING</div>
</div>
<div class="debug-server" id="wsServer">-</div>
<div class="debug-grid">
<div class="debug-cell">
<span>MIME</span>
<b id="dbgMime">-</b>
</div>
<div class="debug-cell">
<span>Downloaded</span>
<b id="dbgDownloaded">0.00 MB</b>
</div>
<div class="debug-cell">
<span>Total</span>
<b id="dbgTotal">-</b>
</div>
<div class="debug-cell">
<span>Progress</span>
<b id="dbgProgress">0%</b>
</div>
<div class="debug-cell">
<span>Chunks</span>
<b id="dbgChunks">0</b>
</div>
<div class="debug-cell">
<span>Loop</span>
<b id="dbgLoop">OFF</b>
</div>
</div>
<div class="debug-bar">
<div class="debug-bar-fill" id="dbgBarFill"></div>
</div>
<div class="debug-log" id="debugLog"></div>
</div>
</div>

<script>
window.VIDEO_CONFIG = {
title: "${safeTitle}",
channel: "${safeChannel}",
duration: "${safeDuration}",
videoUrl: "${safeVideoUrl}",
wsUrl: "${safeWsUrl}",
autoplay: false,
volume: 0.8,
loop: false
};

var video = document.getElementById("videoPlayer");
var frame = document.getElementById("videoFrame");
var songTitle = document.getElementById("songTitle");
var artist = document.getElementById("artist");
var progress = document.getElementById("progress");
var currentTime = document.getElementById("currentTime");
var durationLabel = document.getElementById("duration");
var volume = document.getElementById("volume");
var smallPlayIcon = document.getElementById("smallPlayIcon");
var smallPauseIcon = document.getElementById("smallPauseIcon");
var repeatButton = document.getElementById("repeatButton");
var playlistSub = document.getElementById("playlistSub");
var isLoop = false;
var userPressed = false;

var config = window.VIDEO_CONFIG || {};
var background = document.getElementById("background");
songTitle.textContent = config.title || "Unknown Video";
artist.textContent = config.channel || "Unknown Channel";
playlistSub.textContent = config.title || "Unknown Video";

if (video.poster && background) {
background.style.backgroundImage = "url('" + video.poster + "')";
}

if (config.volume !== undefined) {
video.volume = config.volume;
volume.value = config.volume;
}
isLoop = config.loop || false;
video.loop = isLoop;
updateLoopStatus();

function formatTime(seconds) {
if (!isFinite(seconds)) return "0:00";
var min = Math.floor(seconds / 60);
var sec = Math.floor(seconds % 60);
if (sec < 10) sec = "0" + sec;
return min + ":" + sec;
}

function updateUI() {
if (video.paused) {
smallPlayIcon.style.display = "block";
smallPauseIcon.style.display = "none";
frame.classList.remove("frame-playing");
} else {
smallPlayIcon.style.display = "none";
smallPauseIcon.style.display = "block";
frame.classList.add("frame-playing");
}
}

function playVideo() {
var result = video.play();
if (result && result.catch) {
result.catch(function() {});
}
updateUI();
}

function toggleVideo() {
if (video.paused) {
if (!video.src) userPressed = true;
playVideo();
} else {
userPressed = false;
video.pause();
}
updateUI();
}

function previousVideo() {
if (!isFinite(video.duration)) return;
video.currentTime = Math.max(0, video.currentTime - 10);
}

function nextVideo() {
if (!isFinite(video.duration)) return;
video.currentTime = Math.min(video.duration, video.currentTime + 10);
}

function seekVideo(value) {
if (!isFinite(video.duration)) return;
video.currentTime = (Number(value) / 100) * video.duration;
}

function changeVolume(value) {
video.volume = Number(value);
if (video.volume > 0) {
video.muted = false;
}
}

function toggleMute() {
video.muted = !video.muted;
}

function toggleRepeat() {
isLoop = !isLoop;
video.loop = isLoop;
repeatButton.style.opacity = isLoop ? "1" : ".55";
repeatButton.title = isLoop ? "Loop ON" : "Loop OFF";
updateLoopStatus();
}

function updateLoopStatus() {
var el = document.getElementById("dbgLoop");
if (el) el.textContent = isLoop ? "ON" : "OFF";
}

video.addEventListener("loadedmetadata", function() {
durationLabel.textContent = formatTime(video.duration);
});

video.addEventListener("timeupdate", function() {
if (!isFinite(video.duration)) return;
var value = (video.currentTime / video.duration) * 100;
progress.value = value;
currentTime.textContent = formatTime(video.currentTime);
durationLabel.textContent = formatTime(video.duration);
});

video.addEventListener("play", function() {
updateUI();
});

video.addEventListener("pause", function() {
updateUI();
});

video.addEventListener("ended", function() {
if (!isLoop) {
progress.value = 0;
currentTime.textContent = "0:00";
video.currentTime = 0;
}
updateUI();
});

var wsVideo = null;
var wsChunks = [];
var wsDownloaded = 0;
var wsTotal = null;
var wsMime = "video/mp4";
var wsObjectUrl = null;
var wsDone = false;
var wsLastLog = 0;

function fmtSize(bytes) {
if (!isFinite(bytes)) return "0 B";
if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
return bytes + " B";
}

function setWsState(state) {
var el = document.getElementById("wsState");
if (el) el.textContent = state;
}

function writeLog(line) {
var box = document.getElementById("debugLog");
if (!box) return;
var div = document.createElement("div");
div.className = "log-line";
div.textContent = line;
box.appendChild(div);
while (box.childNodes.length > 80) {
box.removeChild(box.firstChild);
}
box.scrollTop = box.scrollHeight;
}

function updateWsProgress() {
var el = document.getElementById("dbgDownloaded");
if (el) el.textContent = fmtSize(wsDownloaded);
if (wsTotal !== null && wsTotal > 0) {
var pct = Math.min(100, (wsDownloaded / wsTotal) * 100);
el = document.getElementById("dbgTotal");
if (el) el.textContent = fmtSize(wsTotal);
el = document.getElementById("dbgProgress");
if (el) el.textContent = pct.toFixed(1) + "%";
el = document.getElementById("dbgBarFill");
if (el) el.style.width = pct.toFixed(1) + "%";
}
el = document.getElementById("dbgChunks");
if (el) el.textContent = String(wsChunks.length);
}

function finishWsDownload(cfg) {
if (wsDone) return;
wsDone = true;
setWsState("COMPLETE");
writeLog("Download complete");
var blob = new Blob(wsChunks, {
type: wsMime || "video/mp4"
});
writeLog("Blob created (" + fmtSize(blob.size) + ")");
if (wsObjectUrl) {
URL.revokeObjectURL(wsObjectUrl);
}
wsObjectUrl = URL.createObjectURL(blob);
writeLog("Video source attached");
video.src = wsObjectUrl;
video.load();
writeLog("Player ready");
if (wsVideo) {
try {
wsVideo.close();
} catch (e) {}
}
wsChunks = [];
if (cfg.autoplay || userPressed) {
setTimeout(function() {
playVideo();
}, 300);
}
}

function startVideoStream(cfg) {
var videoUrl = cfg.videoUrl || "";
var wsUrl = cfg.wsUrl || "";
if (!wsUrl && videoUrl) {
wsUrl = "wss://stream.kanara.my.id/?url=" + encodeURIComponent(videoUrl);
}
var serverEl = document.getElementById("wsServer");
if (serverEl) {
var host = "-";
try {
host = new URL(wsUrl).host;
} catch (e) {}
serverEl.textContent = host || "-";
}
if (!wsUrl) {
setWsState("ERROR");
writeLog("No video URL tersedia");
return;
}
if (typeof WebSocket === "undefined") {
setWsState("ERROR");
writeLog("WebSocket API tidak tersedia");
return;
}
writeLog("Connecting...");
setWsState("CONNECTING");
wsVideo = new WebSocket(wsUrl);
wsVideo.binaryType = "arraybuffer";
wsVideo.onopen = function() {
writeLog("WebSocket OPEN");
setWsState("CONNECTED");
};
wsVideo.onmessage = function(event) {
if (typeof event.data === "string") {
var message = null;
try {
message = JSON.parse(event.data);
} catch (e) {}
if (!message) return;
if (message.type === "start") {
wsMime = message.mime || "video/mp4";
if (message.contentLength !== undefined && message.contentLength !== null) {
wsTotal = Number(message.contentLength);
} else if (message.length !== undefined && message.length !== null) {
wsTotal = Number(message.length);
}
var mimeEl = document.getElementById("dbgMime");
if (mimeEl) mimeEl.textContent = wsMime;
writeLog("START | MIME: " + wsMime);
if (wsTotal !== null && wsTotal > 0) {
writeLog("Size: " + fmtSize(wsTotal));
}
setWsState("DOWNLOADING");
updateWsProgress();
return;
}
if (message.type === "end") {
writeLog("END");
finishWsDownload(config);
return;
}
if (message.type === "error") {
writeLog("Server error: " + (message.message || "unknown"));
setWsState("ERROR");
return;
}
return;
}
wsChunks.push(event.data);
var bytes = event.data.byteLength || 0;
wsDownloaded += bytes;
var now = Date.now();
if (now - wsLastLog > 400) {
wsLastLog = now;
writeLog("Binary chunk: " + fmtSize(bytes));
}
updateWsProgress();
};
wsVideo.onerror = function() {
writeLog("WebSocket error");
setWsState("ERROR");
};
wsVideo.onclose = function(event) {
if (wsDone) {
setWsState("COMPLETE");
return;
}
writeLog("WebSocket closed unexpectedly");
writeLog("Code: " + event.code + " Reason: " + (event.reason || "-"));
setWsState("CLOSED");
};
window.addEventListener("beforeunload", function() {
if (wsVideo) {
try {
wsVideo.close();
} catch (e) {}
}
if (wsObjectUrl) {
URL.revokeObjectURL(wsObjectUrl);
}
});
}

startVideoStream(config);
</script>`;
}

async function react(conn, m, emoji) {
  return conn.sendMessage(m.chat, {
    react: {
      text: emoji,
      key: m.reactKey || m.key
    }
  });
}

function injectEmbeddedScreen(message, {
  html,
  screenTitle = 'Preview',
  url = 'https://example.com',
  trustedSources = ['example.com']
}) {
  const richResponseMessage = message?.botForwardedMessage?.message?.richResponseMessage;
  if (!richResponseMessage?.unifiedResponse?.data) {
    throw new Error('unifiedResponse.data tidak ditemukan di message hasil AIRich.build()');
  }

  const decoded = JSON.parse(Buffer.from(richResponseMessage.unifiedResponse.data, 'base64').toString('utf8'));

  decoded.embedded_screens = [
    {
      title: screenTitle,
      content: [
        {
          __typename: 'FOAIDNixelButtonSheets',
          tabs: [
            {
              id: 'tab_0',
              tab_header: 'Widget',
              sections: [
                {
                  __typename: 'GenAIUnifiedResponseSection',
                  view_model: {
                    __typename: 'GenAISingleLayoutViewModel',
                    primitive: {
                      __typename: 'GenAIaeacdsnwHtmlPrimitive',
                      payload: html,
                      url,
                      trusted_sources: trustedSources
                    }
                  }
                }
              ],
              step_entries: []
            }
          ]
        }
      ]
    }
  ];

  richResponseMessage.unifiedResponse.data = Buffer.from(JSON.stringify(decoded)).toString('base64');
  return message;
}

async function runYtPlay(m, { conn, text }) {
  const query = text ? text.trim() : (m.q ? m.q.trim() : '');
  if (!query) throw 'Mana judul atau link video YouTube yang mau diputar?';

  await react(conn, m, '⏳');

  try {
    const youtubeUrl = await searchYoutube(query);
    const info = await getYoutubeDirectUrl(youtubeUrl, '360');

    if (!info?.url) {
      throw new Error('Gagal mendapatkan direct link video.');
    }

    let posterBase64 = '';
    if (info.thumb) {
      try {
        const thumbRes = await axios.get(info.thumb, {
          responseType: 'arraybuffer',
          timeout: 10000
        });
        posterBase64 = 'data:image/jpeg;base64,' + Buffer.from(thumbRes.data).toString('base64');
      } catch {}
    }

    const wsUrl = `wss://stream.kanara.my.id/?url=${encodeURIComponent(info.url)}`;
    const htmlPayload = buildPlayerHtml({
      title: info.title || 'YouTube Video',
      channel: info.author || 'YouTube',
      duration: info.duration ? `${Math.floor(info.duration / 60)}:${String(info.duration % 60).padStart(2, '0')}` : '',
      videoUrl: info.url,
      wsUrl,
      posterBase64
    });

    const titleHeader = info.title ? `YOUTUBE PLAY - ${info.title}` : 'YOUTUBE PLAY';

    const rich = new AIRich(conn);

    rich.addSection(
      AIRich.newLayout('Single', {
        title: titleHeader,
        is_in_progress: true,
        __typename: Typenames.BOT_PROGESS_STATUS
      })
    );

    const built = await rich.build(m.chat, { quoted: m });

    injectEmbeddedScreen(built.message, {
      html: htmlPayload,
      screenTitle: 'YouTube Player'
    });

    await conn.relayMessage(built.key.remoteJid, built.message, {
      messageId: built.key.id,
      additionalNodes: []
    });

    const edited = await rich.buildEdit(built.key.remoteJid, built.key.id, {
      msg: built.message
    });

    await conn.relayMessage(edited.key.remoteJid, edited.message, {
      messageId: edited.key.id
    });

    return react(conn, m, '✅');

  } catch (err) {
    console.error('[ytplay error]', err);
    await react(conn, m, '❌');
    return m.reply(`❌ Gagal memutar video YouTube: ${err.message || err}`);
  }
}

let handler = async (m, ctx) => {
  return runYtPlay(m, ctx);
};

handler.help = ['ytplay', 'ytp'];
handler.tags = ['search'];
handler.command = /^(ytplay|ytp)$/i;
handler.owner = false;

export default handler;
