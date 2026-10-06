import { AIRich } from '../../lib/ui/MessageBuilder.js';
import { generateWAMessageFromContent } from 'baileys';
import crypto from 'crypto';

const dinoHtml = `<style>*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}</style>
<body style="margin:0;background:transparent;font-family:Arial,sans-serif;color:#eee;touch-action:manipulation;cursor:pointer">
<div style="width:100%;max-width:620px;margin:auto;padding:16px;box-sizing:border-box">
<div style="background:rgba(255,255,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.15);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.35)">
<div style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.12);display:flex;justify-content:space-between;align-items:center">
<div><div style="font-size:11px;letter-spacing:1.5px;color:rgba(255,255,255,.45)">RENZ DINO</div><div style="font-size:21px;font-weight:bold;color:#fff">Dino Runner</div></div>
<div style="text-align:right"><div id="score" style="font-size:18px;font-weight:bold;color:#fff;text-shadow:0 0 10px rgba(108,92,231,.85);transition:transform .15s">00000</div><div id="best" style="font-size:10px;color:rgba(255,255,255,.4);margin-top:2px">BEST 00000</div></div>
</div>
<div style="padding:18px">
<canvas id="game" width="560" height="190" style="width:100%;height:auto;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.12);border-radius:12px;display:block"></canvas>
<div id="status" style="text-align:center;margin-top:10px;font-size:12px;color:rgba(255,255,255,.55)">Speed 5.0x</div>
</div></div></div>
<script>
const c=document.getElementById('game'),x=c.getContext('2d'),scoreEl=document.getElementById('score'),bestEl=document.getElementById('best'),statusEl=document.getElementById('status');
const GY=170;
let d,o,clouds,particles,ambient,trail,score,best=0,speed,gameOver,last,shake,flash,runT,spawnTimer,milestone,squash;
function loadBest(){
let vals=[];
try{let v=localStorage.getItem('dino_best');if(v)vals.push(parseInt(v,10))}catch(e){}
try{let v=sessionStorage.getItem('dino_best');if(v)vals.push(parseInt(v,10))}catch(e){}
try{let m=document.cookie.match(/(?:^|;\\s*)dino_best=(\\d+)/);if(m)vals.push(parseInt(m[1],10))}catch(e){}
return vals.length?Math.max(...vals.filter(v=>!isNaN(v))):0
}
function saveBest(v){
let val=String(Math.floor(v));
try{localStorage.setItem('dino_best',val)}catch(e){}
try{sessionStorage.setItem('dino_best',val)}catch(e){}
try{document.cookie='dino_best='+val+';max-age=31536000;path=/'}catch(e){}
try{
let rq=indexedDB.open('dino_db',1);
rq.onupgradeneeded=()=>{rq.result.createObjectStore('kv')};
rq.onsuccess=()=>{try{rq.result.transaction('kv','readwrite').objectStore('kv').put(val,'dino_best')}catch(e){}}
}catch(e){}
}
function loadBestAsync(cb){
try{
let rq=indexedDB.open('dino_db',1);
rq.onupgradeneeded=()=>{rq.result.createObjectStore('kv')};
rq.onsuccess=()=>{
try{
let gr=rq.result.transaction('kv','readonly').objectStore('kv').get('dino_best');
gr.onsuccess=()=>{if(gr.result)cb(parseInt(gr.result,10))}
}catch(e){}
}
}catch(e){}
}
best=loadBest();
loadBestAsync(v=>{if(!isNaN(v)&&v>best){best=v;bestEl.textContent='BEST '+String(Math.floor(best)).padStart(5,'0')}});
function reset(){
d={x:55,y:132,w:27,h:30,vy:0,jumping:false};
o=[];
clouds=[{x:120,y:32,w:44,s:.35},{x:300,y:52,w:60,s:.22},{x:460,y:26,w:36,s:.4},{x:560,y:70,w:50,s:.18}];
particles=[];
trail=[];
if(!ambient){ambient=[];for(let i=0;i<18;i++)ambient.push({x:Math.random()*c.width,y:Math.random()*c.height,r:.5+Math.random()*1.5,vx:.1+Math.random()*.3,ph:Math.random()*10})}
score=0;speed=5;gameOver=false;last=0;shake=0;flash=0;runT=0;milestone=0;squash=1;
spawnTimer=70+Math.random()*30;
bestEl.textContent='BEST '+String(Math.floor(best)).padStart(5,'0');
statusEl.textContent='Speed 5.0x'
}
function burst(px,py,n,col,spd){for(let i=0;i<n;i++)particles.push({x:px,y:py,vx:(Math.random()-.5)*spd,vy:-Math.random()*spd,life:1,col,size:2+Math.random()*2})}
function jumpDino(){
if(gameOver){reset();return}
if(!d.jumping){d.jumping=true;d.vy=-13;squash=.7;burst(d.x+13,d.y+30,10,'255,255,255',4)}
}
function cactus(){
let h=24+Math.random()*24;
o.push({x:c.width+20,y:GY-h,w:16+Math.random()*6,h});
if(Math.random()<.22){o.push({x:c.width+20+34+Math.random()*10,y:GY-(20+Math.random()*18),w:16,h:20+Math.random()*18})}
}
function hit(a,b){return a.x+4<b.x+b.w&&a.x+a.w-4>b.x&&a.y+4<b.y+b.h&&a.y+a.h>b.y}
function drawTrail(){
trail.forEach((p,i)=>{x.fillStyle='rgba(108,92,231,'+(.25*(i/trail.length))+')';x.fillRect(p.x,p.y,27,30)})
}
function drawDino(){
x.save();
let cx=d.x+13,cy=d.y+30;
x.translate(cx,cy);
x.scale(1/squash,squash);
x.translate(-cx,-cy);
let legOff=d.jumping?0:Math.sin(runT*.5)*5;
x.fillStyle='#eaeaea';
x.fillRect(d.x,d.y,27,30);
x.fillRect(d.x+22,d.y+5,13,18);
x.fillStyle='#6c5ce7';
x.fillRect(d.x+29,d.y+8,4,4);
x.fillStyle='#eaeaea';
x.fillRect(d.x+5,d.y+30,6,8+legOff);
x.fillRect(d.x+20,d.y+30,6,8-legOff);
x.restore()
}
function drawCactus(q){
x.save();
x.shadowColor='rgba(255,90,90,.35)';x.shadowBlur=10;
x.fillStyle='#e17a7a';
x.fillRect(q.x,q.y,q.w,q.h);
x.fillRect(q.x-7,q.y+10,7,6);
x.fillRect(q.x-7,q.y+4,6,12);
x.fillRect(q.x+q.w,q.y+18,7,6);
x.fillRect(q.x+q.w+1,q.y+12,6,12);
x.restore()
}
function drawParticles(){
particles.forEach(p=>{x.fillStyle='rgba('+p.col+','+Math.max(p.life,0)+')';x.fillRect(p.x,p.y,p.size,p.size)})
}
function drawAmbient(){
ambient.forEach(p=>{let a=.15+Math.sin(runT*.05+p.ph)*.1;x.fillStyle='rgba(180,160,255,'+a+')';x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()})
}
function draw(){
x.clearRect(0,0,c.width,c.height);
x.save();
if(shake>0)x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
drawAmbient();
x.fillStyle='rgba(255,255,255,.35)';
clouds.forEach(q=>{let b=Math.sin(runT*.03+q.x)*2;x.fillRect(q.x,q.y+b,q.w,5);x.fillRect(q.x+10,q.y+b-5,q.w*.45,10)});
x.strokeStyle='rgba(255,255,255,.25)';
x.lineWidth=2;
x.setLineDash([10,8]);
x.lineDashOffset=-runT*speed*.6;
x.beginPath();x.moveTo(0,GY);x.lineTo(c.width,GY);x.stroke();
x.setLineDash([]);
drawTrail();
drawDino();
o.forEach(drawCactus);
drawParticles();
if(flash>0){x.fillStyle='rgba(255,60,60,'+(flash*.35)+')';x.fillRect(0,0,c.width,c.height)}
x.restore();
if(gameOver){
x.fillStyle='rgba(15,15,25,.55)';x.fillRect(0,0,c.width,c.height);
x.fillStyle='#fff';x.textAlign='center';
x.font='bold 24px Arial';x.fillText('GAME OVER',c.width/2,85);
x.font='14px Arial';x.fillText('Tap layar untuk main lagi',c.width/2,112);
x.textAlign='left'
}
}
function loop(t){
if(!last)last=t;
let dt=Math.min((t-last)/16.67,2);
last=t;
runT+=dt;
if(!gameOver){
d.y+=d.vy*dt;d.vy+=.75*dt;
if(d.y>=132){
if(d.jumping){burst(d.x+13,GY,10,'255,255,255',3.5);squash=1.35}
d.y=132;d.vy=0;d.jumping=false
}
if(d.jumping)trail.push({x:d.x,y:d.y});
if(trail.length>6)trail.shift();
if(!d.jumping)trail.length=0;
squash+=(1-squash)*.18*dt;
if(!d.jumping&&Math.floor(runT)%8===0&&Math.random()<.4)burst(d.x+6,GY-2,1,'255,255,255',1.5);
ambient.forEach(p=>{p.x-=p.vx*dt;if(p.x<-4)p.x=c.width+4});
spawnTimer-=dt;
if(spawnTimer<=0){cactus();spawnTimer=Math.max(38,62-speed*1.4)+Math.random()*30}
o.forEach(q=>q.x-=speed*dt);
o=o.filter(q=>q.x>-40);
clouds.forEach(q=>{q.x-=q.s*dt;if(q.x<-80)q.x=c.width+Math.random()*100});
particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.3*dt;p.life-=.03*dt});
particles=particles.filter(p=>p.life>0);
speed=Math.min(11,speed+.0018*dt);
score+=dt*.6;
if(score>best)best=score;
if(Math.floor(score/500)>milestone){
milestone=Math.floor(score/500);
scoreEl.style.transform='scale(1.35)';
setTimeout(()=>scoreEl.style.transform='scale(1)',150)
}
scoreEl.textContent=String(Math.floor(score)).padStart(5,'0');
bestEl.textContent='BEST '+String(Math.floor(best)).padStart(5,'0');
statusEl.textContent='Speed '+speed.toFixed(1)+'x';
for(const q of o)if(hit(d,q)){
gameOver=true;shake=14;flash=1;
saveBest(best);
burst(d.x+13,d.y+15,18,'255,90,90',5)
}
}
if(shake>0)shake=Math.max(0,shake-.6*dt);
if(flash>0)flash=Math.max(0,flash-.05*dt);
draw();
requestAnimationFrame(loop)
}
document.addEventListener('pointerdown',e=>{e.preventDefault();jumpDino()});
document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();jumpDino()}});
reset();
requestAnimationFrame(loop);
</script></body>`;

const tttHtml = `<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}
body{margin:0;background:transparent;color:#fff;font-family:Arial,sans-serif;touch-action:manipulation}
.wrap{width:100%;max-width:500px;margin:auto;padding:14px}
.card{padding:18px;border-radius:22px;background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.13);box-shadow:0 20px 60px rgba(0,0,0,.55)}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}
.brand small{display:block;color:rgba(255,255,255,.38);font-size:8px;letter-spacing:3px}
.brand b{display:block;margin-top:4px;font-size:21px;letter-spacing:.5px}
.status{text-align:right;font-size:10px;color:rgba(255,255,255,.55)}
.score{margin-top:4px;color:#fff;font-size:13px}
.controls{display:flex;gap:8px;margin-bottom:14px}
select,button{flex:1;min-width:0;border:1px solid rgba(255,255,255,.13);border-radius:11px;padding:11px;background:#111116;color:#fff;font-weight:bold;outline:none}
button{cursor:pointer}
button:active{transform:scale(.95)}
.board{position:relative;width:100%;aspect-ratio:1;display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:7px;border-radius:17px;background:#07070b;border:1px solid rgba(255,255,255,.09)}
.cell{display:flex;align-items:center;justify-content:center;border-radius:13px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.065);font-size:52px;font-weight:900;cursor:pointer;transition:transform .12s,background .12s}
.cell:active{transform:scale(.92)}
.cell.x{color:#fff;text-shadow:0 0 12px rgba(255,255,255,.8),0 0 28px rgba(255,255,255,.35)}
.cell.o{color:#8d7cff;text-shadow:0 0 12px rgba(141,124,255,.9),0 0 28px rgba(141,124,255,.45)}
.cell.win{animation:win .55s infinite alternate}
@keyframes win{from{transform:scale(1);background:rgba(255,255,255,.06)}to{transform:scale(1.06);background:rgba(255,255,255,.17);box-shadow:0 0 25px rgba(255,255,255,.35)}}
.win-line{position:absolute;height:5px;border-radius:10px;background:#fff;box-shadow:0 0 10px #fff,0 0 25px rgba(141,124,255,.9);transform-origin:left center;transform:scaleX(0);transition:transform .5s cubic-bezier(.2,.8,.2,1);z-index:10;pointer-events:none}
.info{margin-top:12px;text-align:center;color:rgba(255,255,255,.42);font-size:10px}
.overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.76);backdrop-filter:blur(7px);opacity:0;pointer-events:none;transition:.25s;z-index:99}
.overlay.show{opacity:1;pointer-events:auto}
.result{width:min(88%,340px);padding:27px 20px;text-align:center;border-radius:22px;background:#111116;border:1px solid rgba(255,255,255,.15);box-shadow:0 25px 70px rgba(0,0,0,.8);transform:scale(.7);transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.overlay.show .result{transform:scale(1)}
.icon{font-size:52px;margin-bottom:7px;animation:pop .5s}
@keyframes pop{0%{transform:scale(.2)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
.result h1{margin:0;font-size:28px;letter-spacing:2px}
.result p{margin:9px 0 20px;color:rgba(255,255,255,.45);font-size:12px}
.result button{width:100%;background:#fff;color:#111}
</style>

<div class="wrap">
<div class="card">
<div class="header">
<div class="brand"><small>NEXUS ARCADE</small><b>TIC TAC TOE</b></div>
<div class="status"><div id="turn">YOUR TURN</div><div class="score"><span id="wins">0</span> - <span id="losses">0</span> - <span id="draws">0</span></div></div>
</div>
<div class="controls">
<select id="difficulty"><option value="easy">EASY</option><option value="normal" selected>NORMAL</option><option value="hard">HARD</option></select>
<button id="reset">RESET</button>
</div>
<div id="board" class="board">
<div id="winLine" class="win-line"></div>
<div class="cell" data-i="0"></div><div class="cell" data-i="1"></div><div class="cell" data-i="2"></div>
<div class="cell" data-i="3"></div><div class="cell" data-i="4"></div><div class="cell" data-i="5"></div>
<div class="cell" data-i="6"></div><div class="cell" data-i="7"></div><div class="cell" data-i="8"></div>
</div>
<div class="info" id="info">YOU = X • CPU = O</div>
</div>
</div>
<div id="overlay" class="overlay"><div class="result"><div class="icon" id="resultIcon">🏆</div><h1 id="resultTitle">YOU WIN</h1><p id="resultText">Nice move.</p><button id="playAgain">PLAY AGAIN</button></div></div>

<script>
const cells=[...document.querySelectorAll(".cell")];const boardEl=document.getElementById("board");const difficulty=document.getElementById("difficulty");const resetBtn=document.getElementById("reset");const turnEl=document.getElementById("turn");const infoEl=document.getElementById("info");const overlay=document.getElementById("overlay");const resultIcon=document.getElementById("resultIcon");const resultTitle=document.getElementById("resultTitle");const resultText=document.getElementById("resultText");const playAgain=document.getElementById("playAgain");const winLine=document.getElementById("winLine");const winsEl=document.getElementById("wins");const lossesEl=document.getElementById("losses");const drawsEl=document.getElementById("draws");
let board=Array(9).fill("");let gameOver=false;let playerTurn=true;let wins=0;let losses=0;let draws=0;
let audioCtx=null;function audio(){if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)()}if(audioCtx.state==="suspended"){audioCtx.resume()}return audioCtx}
function tone(f,d,t="sine",v=.05){const c=audio();const o=c.createOscillator();const g=c.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d)}
function clickSound(){tone(520,.07,"square",.035)}function moveSound(){tone(650,.09,"sine",.05)}function errorSound(){tone(130,.15,"sawtooth",.05)}function winSound(){tone(523,.15,"sine",.06);setTimeout(()=>{tone(659,.15,"sine",.06)},120);setTimeout(()=>{tone(784,.25,"sine",.07)},240)}function loseSound(){tone(330,.18,"sawtooth",.05);setTimeout(()=>{tone(220,.3,"sawtooth",.05)},180)}function drawSound(){tone(440,.12,"square",.04);setTimeout(()=>{tone(440,.18,"square",.04)},150)}
const combinations=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function checkWinner(b){for(const[a,c,d]of combinations){if(b[a]&&b[a]===b[c]&&b[a]===b[d]){return{winner:b[a],combo:[a,c,d]}}}if(b.every(c=>c!=="")){return{winner:"draw",combo:null}}return null}
function render(){cells.forEach((cell,i)=>{cell.textContent=board[i];cell.classList.remove("x","o");if(board[i]){cell.classList.add(board[i].toLowerCase())}})}
function showWinLine(combo){if(!combo)return;const first=cells[combo[0]];const last=cells[combo[2]];const br=boardEl.getBoundingClientRect();const fr=first.getBoundingClientRect();const lr=last.getBoundingClientRect();const x1=fr.left+fr.width/2-br.left;const y1=fr.top+fr.height/2-br.top;const x2=lr.left+lr.width/2-br.left;const y2=lr.top+lr.height/2-br.top;const dx=x2-x1;const dy=y2-y1;const len=Math.sqrt(dx*dx+dy*dy);const ang=Math.atan2(dy,dx)*180/Math.PI;winLine.style.left=x1+"px";winLine.style.top=y1+"px";winLine.style.width=len+"px";winLine.style.transform="rotate("+ang+"deg) scaleX(1)";combo.forEach(i=>cells[i].classList.add("win"))}
function resetLine(){winLine.style.transform="rotate(0deg) scaleX(0)";cells.forEach(c=>c.classList.remove("win"))}
function finish(r){gameOver=true;if(r.winner==="X"){wins++;winsEl.textContent=wins;turnEl.textContent="YOU WIN";resultIcon.textContent="🏆";resultTitle.textContent="YOU WIN";resultText.textContent="GG! Gerakan lu mantap.";winSound()}else if(r.winner==="O"){losses++;lossesEl.textContent=losses;turnEl.textContent="YOU LOSE";resultIcon.textContent="💀";resultTitle.textContent="YOU LOSE";resultText.textContent="CPU berhasil mengalahkan lu.";loseSound()}else{draws++;drawsEl.textContent=draws;turnEl.textContent="DRAW";resultIcon.textContent="🤝";resultTitle.textContent="DRAW";resultText.textContent="Tidak ada pemenang.";drawSound()}if(r.combo){showWinLine(r.combo)}setTimeout(()=>overlay.classList.add("show"),650)}
function playerMove(i){if(gameOver||!playerTurn||board[i]){if(!gameOver&&board[i]){errorSound()}return}audio();board[i]="X";playerTurn=false;moveSound();render();const r=checkWinner(board);if(r){finish(r);return}turnEl.textContent="CPU THINKING";infoEl.textContent="CPU SEDANG BERPIKIR...";setTimeout(cpuMove,350+Math.random()*350)}
function emptyCells(b){const a=[];b.forEach((v,i)=>{if(!v)a.push(i)});return a}
function randomMove(){const a=emptyCells(board);return a[Math.floor(Math.random()*a.length)]}
function winningMove(s){for(const i of emptyCells(board)){board[i]=s;const r=checkWinner(board);board[i]="";if(r&&r.winner===s)return i}return null}
function mediumMove(){let m=winningMove("O");if(m!==null)return m;m=winningMove("X");if(m!==null)return m;if(!board[4])return 4;const c=[0,2,6,8].filter(i=>!board[i]);if(c.length)return c[Math.floor(Math.random()*c.length)];return randomMove()}
function minimax(b,max){const r=checkWinner(b);if(r){if(r.winner==="O")return 10;if(r.winner==="X")return-10;return 0}if(max){let best=-Infinity;for(const i of emptyCells(b)){b[i]="O";const v=minimax(b,false);b[i]="";best=Math.max(best,v)}return best}let best=Infinity;for(const i of emptyCells(b)){b[i]="X";const v=minimax(b,true);b[i]="";best=Math.min(best,v)}return best}
function hardMove(){let best=-Infinity;let move=null;for(const i of emptyCells(board)){board[i]="O";const s=minimax(board,false);board[i]="";if(s>best){best=s;move=i}}return move}
function cpuMove(){if(gameOver)return;let m;if(difficulty.value==="easy")m=randomMove();else if(difficulty.value==="normal")m=mediumMove();else m=hardMove();if(m==null)m=randomMove();board[m]="O";moveSound();render();const r=checkWinner(board);if(r){finish(r);return}playerTurn=true;turnEl.textContent="YOUR TURN";infoEl.textContent="PILIH KOTAK"}
function startGame(){board=Array(9).fill("");gameOver=false;playerTurn=true;overlay.classList.remove("show");resetLine();turnEl.textContent="YOUR TURN";infoEl.textContent="YOU = X • CPU = O";render()}
cells.forEach((cell,i)=>cell.addEventListener("pointerdown",e=>{e.preventDefault();playerMove(i)}));
resetBtn.addEventListener("pointerdown",e=>{e.preventDefault();clickSound();startGame()});
playAgain.addEventListener("pointerdown",e=>{e.preventDefault();clickSound();startGame()});
difficulty.addEventListener("change",()=>{clickSound();startGame()});
window.addEventListener("resize",()=>{const r=checkWinner(board);if(r&&r.combo&&gameOver){showWinLine(r.combo)}});
startGame();
</script>`

const doomHtml = `<style>*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}</style>\n<body style=\"margin:0;background:transparent;font-family:Arial,sans-serif;color:#eee;touch-action:manipulation;cursor:pointer\">\n<div style=\"width:100%;max-width:620px;margin:auto;box-sizing:border-box\">\n<div style=\"position:relative;width:100%;aspect-ratio:16/9;background:rgba(255,255,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.15);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.35)\">\n<canvas id=\"game\" width=\"480\" height=\"270\" style=\"position:absolute;inset:0;width:100%;height:100%;display:block;background:#000;touch-action:none\"></canvas>\n<div style=\"position:absolute;top:8px;left:12px;pointer-events:none;text-shadow:0 1px 4px rgba(0,0,0,.9)\">\n<div style=\"font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,.65)\">RENZ DOOM</div>\n<div style=\"font-size:14px;font-weight:bold;color:#fff\">Mini Doom FPS</div>\n</div>\n<div style=\"position:absolute;top:8px;right:12px;text-align:right;pointer-events:none;text-shadow:0 1px 4px rgba(0,0,0,.9)\">\n<div id=\"hp\" style=\"font-size:13px;font-weight:bold;color:#fff;transition:transform .15s\">HP 100</div>\n<div id=\"ammo\" style=\"font-size:9px;color:rgba(255,255,255,.75);margin-top:1px\">AMMO 30 · SCORE 0</div>\n</div>\n<div id=\"status\" style=\"position:absolute;bottom:6px;left:0;right:0;text-align:center;font-size:9px;color:rgba(255,255,255,.75);pointer-events:none;text-shadow:0 1px 4px rgba(0,0,0,.9)\">5 musuh tersisa</div>\n<div style=\"position:absolute;bottom:6px;left:6px;display:flex;gap:5px\">\n<button id=\"forward\" style=\"width:44px;height:32px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(0,0,0,.4);color:#fff;font-size:14px;padding:0\">▲</button>\n</div>\n<div style=\"position:absolute;bottom:6px;right:6px;display:grid;grid-template-columns:repeat(3,32px);gap:5px\">\n<button id=\"strafeL\" style=\"width:32px;height:32px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(0,0,0,.4);color:#fff;font-size:13px;padding:0\">◀</button>\n<button id=\"fire\" style=\"width:32px;height:32px;border:1px solid rgba(230,60,60,.5);border-radius:8px;background:rgba(230,60,60,.35);color:#fff;font-size:13px;padding:0\">🔥</button>\n<button id=\"strafeR\" style=\"width:32px;height:32px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(0,0,0,.4);color:#fff;font-size:13px;padding:0\">▶</button>\n</div>\n</div></div>\n<script>\nconst c=document.getElementById('game'),x=c.getContext('2d'),hpEl=document.getElementById('hp'),ammoEl=document.getElementById('ammo'),statusEl=document.getElementById('status');\nx.imageSmoothingEnabled=false;\nconst W=c.width,H=c.height;\nconst map=[\"################\",\"#..............#\",\"#..##....##....#\",\"#..#..........##\",\"#..#..####.....#\",\"#.....#........#\",\"###...#..####..#\",\"#.....#........#\",\"#..####........#\",\"#........####..#\",\"#........#.....#\",\"#..##....#.....#\",\"#..##..........#\",\"#..............#\",\"#..............#\",\"################\"];\nconst player={x:2.5,y:2.5,angle:0,hp:100,ammo:30,score:0,fireCooldown:0,muzzle:0,hurt:0};\nlet enemies,pickups,particles,ambient,shake,bobT,runT,endT,gameOver,win;\nconst keys=Object.create(null);\nconst FOV=Math.PI/3,MOVE=.052;\nlet zBuffer=new Float32Array(W);\nfunction initEnemies(){return [{x:11.5,y:2.5,hp:60,max:60,dead:false,flash:0},{x:7.5,y:5.5,hp:60,max:60,dead:false,flash:0},{x:13.5,y:8.5,hp:60,max:60,dead:false,flash:0},{x:5.5,y:10.5,hp:60,max:60,dead:false,flash:0},{x:11.5,y:12.5,hp:60,max:60,dead:false,flash:0}]}\nfunction initPickups(){return [{x:4.5,y:1.5,type:\"ammo\",taken:false},{x:14.5,y:5.5,type:\"health\",taken:false},{x:3.5,y:13.5,type:\"ammo\",taken:false}]}\nfunction reset(){\nplayer.x=2.5;player.y=2.5;player.angle=0;player.hp=100;player.ammo=30;player.score=0;player.fireCooldown=0;player.muzzle=0;player.hurt=0;\nenemies=initEnemies();pickups=initPickups();particles=[];\nif(!ambient){ambient=[];for(let i=0;i<16;i++)ambient.push({x:Math.random()*W,y:Math.random()*H,r:.6+Math.random()*1.2,vx:.15+Math.random()*.25,ph:Math.random()*10})}\nshake=0;bobT=0;runT=0;endT=0;gameOver=false;win=false\n}\nfunction burst(px,py,n,col,spd,grav){for(let i=0;i<n;i++)particles.push({x:px,y:py,vx:(Math.random()-.5)*spd,vy:-Math.random()*spd,life:1,col,size:2+Math.random()*2.5,grav:grav||0})}\nfunction isWall(px,py){const mx=Math.floor(px),my=Math.floor(py);if(mx<0||my<0||my>=map.length||mx>=map[0].length)return true;return map[my][mx]===\"#\"}\nfunction canWalk(px,py){const r=.18;return !isWall(px-r,py-r)&&!isWall(px+r,py-r)&&!isWall(px-r,py+r)&&!isWall(px+r,py+r)}\nfunction move(dx,dy){const nx=player.x+dx,ny=player.y+dy;if(canWalk(nx,player.y))player.x=nx;if(canWalk(player.x,ny))player.y=ny}\nfunction normAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a}\nfunction dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}\nfunction lineClear(x1,y1,x2,y2){const d=Math.hypot(x2-x1,y2-y1),steps=Math.ceil(d/.08);for(let i=1;i<steps;i++){const t=i/steps,px=x1+(x2-x1)*t,py=y1+(y2-y1)*t;if(isWall(px,py))return false}return true}\nfunction castRay(a){const ca=Math.cos(a),sa=Math.sin(a);let d=0;while(d<30){d+=.025;if(isWall(player.x+ca*d,player.y+sa*d))break}return d}\nfunction screenPos(ex,ey){const dx=ex-player.x,dy=ey-player.y,d=Math.hypot(dx,dy);const a=normAngle(Math.atan2(dy,dx)-player.angle);const sx=W/2+Math.tan(a)*(W/2)/Math.tan(FOV/2);return {sx,d,a}}\nfunction shoot(){\nif(player.fireCooldown>0||player.ammo<=0||gameOver||win)return;\nplayer.fireCooldown=13;player.ammo--;player.muzzle=4;\nburst(W/2,H-88,7,'255,210,80',3,.1);\nlet best=null,bestDist=Infinity;\nfor(const e of enemies){\nif(e.dead)continue;\nconst {sx,d,a}=screenPos(e.x,e.y);\nif(d>10)continue;\nconst tol=.055+.16/d;\nif(Math.abs(a)<tol&&d<bestDist&&lineClear(player.x,player.y,e.x,e.y)){best=e;bestDist=d}\n}\nif(best){\nconst dmg=25+Math.floor(Math.random()*12);\nbest.hp-=dmg;best.flash=6;\nconst {sx,d}=screenPos(best.x,best.y);\nconst size=Math.min(H*1.8,H/d*.72);\nif(best.hp<=0){best.dead=true;player.score+=100;burst(sx,H/2,22,'220,40,40',4.5,.25)}\nelse{player.score+=10;burst(sx,H/2,10,'220,40,40',3.5,.2)}\n}\n}\nfunction updateEnemies(){\nfor(const e of enemies){\nif(e.dead)continue;\nif(e.flash>0)e.flash--;\nconst d=dist(player,e);\nif(d<1){\nplayer.hp-=.18;player.hurt=6;shake=Math.max(shake,4.5);\nconst a=Math.atan2(e.y-player.y,e.x-player.x);\nplayer.x-=Math.cos(a)*.015;player.y-=Math.sin(a)*.015;\ncontinue\n}\nif(d<7&&lineClear(e.x,e.y,player.x,player.y)){\nconst a=Math.atan2(player.y-e.y,player.x-e.x),spd=.0085;\nconst nx=e.x+Math.cos(a)*spd,ny=e.y+Math.sin(a)*spd;\nif(canWalk(nx,ny)){e.x=nx;e.y=ny}\nif(Math.random()<.006&&d<6){player.hp-=2.5;player.hurt=10;shake=Math.max(shake,3.5);}\n}\n}\n}\nfunction updatePickups(){\nfor(const p of pickups){\nif(p.taken)continue;\nif(Math.hypot(player.x-p.x,player.y-p.y)<.55){\np.taken=true;\nif(p.type===\"ammo\")player.ammo=Math.min(99,player.ammo+15);\nif(p.type===\"health\")player.hp=Math.min(100,player.hp+25)\n}\n}\n}\nfunction update(){\nrunT++;\nif(gameOver||win){endT++;return}\nif(player.fireCooldown>0)player.fireCooldown--;\nif(player.muzzle>0)player.muzzle--;\nif(player.hurt>0)player.hurt--;\nif(shake>0)shake=Math.max(0,shake-.6);\nlet dx=0,dy=0;\nconst moving=keys.forward||keys.strafeL||keys.strafeR;\nif(moving)bobT++;else bobT+=.15;\nif(keys.forward){dx+=Math.cos(player.angle)*MOVE;dy+=Math.sin(player.angle)*MOVE}\nif(keys.strafeL){dx+=Math.cos(player.angle-Math.PI/2)*MOVE;dy+=Math.sin(player.angle-Math.PI/2)*MOVE}\nif(keys.strafeR){dx+=Math.cos(player.angle+Math.PI/2)*MOVE;dy+=Math.sin(player.angle+Math.PI/2)*MOVE}\nmove(dx,dy);\nupdateEnemies();updatePickups();\nif(keys.fire)shoot();\nparticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.grav;p.life-=.035});\nparticles=particles.filter(p=>p.life>0);\nambient.forEach(p=>{p.x-=p.vx;if(p.x<-4)p.x=W+4});\nif(enemies.filter(e=>!e.dead).length===0)win=true;\nif(player.hp<=0)gameOver=true\n}\nfunction wallColor(d,side){let l=230-d*18;if(side)l*=.76;l=Math.max(25,Math.min(220,l));return 'rgb('+Math.floor(l)+','+Math.floor(l*.62)+','+Math.floor(l*.48)+')'}\nfunction drawWalls(bob){\nconst half=H/2+bob,halfFov=FOV/2;\nconst sky=x.createLinearGradient(0,0,0,half);sky.addColorStop(0,'#12151a');sky.addColorStop(1,'#34302b');\nx.fillStyle=sky;x.fillRect(0,0,W,half);\nconst floor=x.createLinearGradient(0,half,0,H);floor.addColorStop(0,'#4a4540');floor.addColorStop(1,'#111');\nx.fillStyle=floor;x.fillRect(0,half,W,H-half);\nfor(let px=0;px<W;px++){\nconst a=player.angle-halfFov+(px/W)*FOV;\nlet raw=castRay(a);\nconst corrected=raw*Math.cos(a-player.angle);\nzBuffer[px]=corrected;\nconst wallH=Math.min(H*3,H/corrected),top=half-wallH/2;\nconst cellX=player.x+Math.cos(a)*raw,cellY=player.y+Math.sin(a)*raw;\nconst wx=cellX-Math.floor(cellX),wy=cellY-Math.floor(cellY);\nconst side=wx<.035||wx>.965;\nx.fillStyle=wallColor(corrected,side);\nx.fillRect(px,top,1,wallH)\n}\n}\nfunction drawEnemySprite(e,bob){\nif(e.dead)return;\nconst {sx,d,a}=screenPos(e.x,e.y);\nif(Math.abs(a)>FOV*.7||d<.2)return;\nconst size=Math.min(H*1.8,H/d*.72);\nconst left=Math.floor(sx-size*.3),top=Math.floor(H/2+bob-size*.48),bottom=Math.floor(H/2+bob+size*.52);\nconst zi=Math.max(0,Math.min(W-1,Math.floor(sx)));\nif(d>zBuffer[zi]+.25)return;\nconst hit=e.flash>0;\nconst wob=Math.sin(runT*.08+e.x*3)*2;\nx.fillStyle=hit?'#fff':'#991b1b';\nx.fillRect(left+size*.12+wob,top+size*.28,size*.36,size*.48);\nx.fillRect(left+size*.16+wob,top,size*.28,size*.22);\nif(size>25){\nx.fillStyle='#ffd000';\nx.fillRect(left+size*.22+wob,top+size*.09,Math.max(2,size*.035),Math.max(2,size*.045));\nx.fillRect(left+size*.38+wob,top+size*.09,Math.max(2,size*.035),Math.max(2,size*.045))\n}\nx.fillStyle=hit?'#fff':'#741414';\nx.fillRect(left-size*.03+wob,top+size*.28,size*.15,size*.11);\nx.fillRect(left+size*.6-size*.12+wob,top+size*.28,size*.15,size*.11);\nx.fillRect(left+size*.13+wob,bottom-size*.23,size*.14,size*.25);\nx.fillRect(left+size*.35+wob,bottom-size*.23,size*.14,size*.25);\nif(size>35){\nconst barW=size*.55;\nx.fillStyle='#111';x.fillRect(sx-barW/2,top-size*.07,barW,4);\nx.fillStyle='#e33';x.fillRect(sx-barW/2,top-size*.07,barW*Math.max(0,e.hp/e.max),4)\n}\n}\nfunction drawPickup(p,bob){\nif(p.taken)return;\nconst {sx,d,a}=screenPos(p.x,p.y);\nif(Math.abs(a)>FOV*.6)return;\nconst pulse=1+.12*Math.sin(runT*.12+p.x*4);\nconst size=Math.min(45,H/d*.2)*pulse;\nconst zi=Math.max(0,Math.min(W-1,Math.floor(sx)));\nif(d>zBuffer[zi]+.15)return;\nx.save();\nx.shadowColor=p.type==='health'?'rgba(33,197,93,.7)':'rgba(246,201,69,.7)';\nx.shadowBlur=10;\nx.fillStyle=p.type==='health'?'#21c55d':'#f6c945';\nx.fillRect(sx-size/2,H/2+bob-size/2,size,size);\nx.restore()\n}\nfunction drawWeapon(bob){\nconst cx=W/2,base=H+bob*1.5;\nx.fillStyle='#282828';x.fillRect(cx-44,base-64,88,50);\nx.fillStyle='#555';x.fillRect(cx-32,base-80,64,24);\nif(player.muzzle>0){\nx.fillStyle=player.muzzle%2?'#fff':'#ffd43b';\nx.beginPath();x.moveTo(cx,base-96);x.lineTo(cx-20,base-68);x.lineTo(cx,base-74);x.lineTo(cx+20,base-68);x.closePath();x.fill()\n}\n}\nfunction drawAmbient(){ambient.forEach(p=>{const a=.12+Math.sin(runT*.04+p.ph)*.08;x.fillStyle='rgba(200,190,255,'+a+')';x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()})}\nfunction drawParticles(){particles.forEach(p=>{x.fillStyle='rgba('+p.col+','+Math.max(p.life,0)+')';x.fillRect(p.x,p.y,p.size,p.size)})}\nfunction drawCrosshair(){\nconst cx=W/2,cy=H/2;\nx.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=2;\nx.beginPath();x.moveTo(cx-5,cy);x.lineTo(cx-1,cy);x.moveTo(cx+1,cy);x.lineTo(cx+5,cy);x.moveTo(cx,cy-5);x.lineTo(cx,cy-1);x.moveTo(cx,cy+1);x.lineTo(cx,cy+5);x.stroke()\n}\nfunction drawVignette(){\nconst g=x.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.75);\ng.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.45)');\nx.fillStyle=g;x.fillRect(0,0,W,H)\n}\nfunction drawEndScreen(){\nif(!gameOver&&!win)return;\nconst a=Math.min(1,endT*.04);\nx.fillStyle='rgba(0,0,0,'+(a*.75)+')';x.fillRect(0,0,W,H);\nx.globalAlpha=a;\nx.textAlign='center';x.fillStyle=win?'#ffd43b':'#f33';x.font='bold 22px Arial';\nx.fillText(win?'LEVEL CLEAR':'YOU DIED',W/2,H/2-10);\nx.fillStyle='#fff';x.font='12px Arial';x.fillText('Skor '+player.score+' · Tap untuk ulang',W/2,H/2+14);\nx.textAlign='left';x.globalAlpha=1\n}\nfunction draw(){\nx.clearRect(0,0,W,H);\nx.save();\nif(shake>0)x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);\nconst bob=Math.sin(bobT*.3)*(keys.forward||keys.strafeL||keys.strafeR?3:.8);\ndrawWalls(bob);\ndrawAmbient();\nconst sprites=[...enemies.filter(e=>!e.dead).map(e=>({t:'e',o:e})),...pickups.filter(p=>!p.taken).map(p=>({t:'p',o:p}))];\nsprites.sort((a,b)=>dist(player,b.o)-dist(player,a.o));\nfor(const s of sprites)s.t==='e'?drawEnemySprite(s.o,bob):drawPickup(s.o,bob);\ndrawParticles();\ndrawWeapon(bob);\ndrawCrosshair();\ndrawVignette();\nif(player.hurt>0){x.fillStyle='rgba(255,0,0,'+(player.hurt/45)+')';x.fillRect(0,0,W,H)}\nx.restore();\ndrawEndScreen();\nhpEl.textContent='HP '+Math.max(0,Math.floor(player.hp));\nammoEl.textContent='AMMO '+player.ammo+' · SCORE '+player.score;\nstatusEl.textContent=win?'Level clear!':gameOver?'Kamu tewas':enemies.filter(e=>!e.dead).length+' musuh tersisa'\n}\nfunction loop(){update();draw();requestAnimationFrame(loop)}\nfunction bind(id,key){\nconst b=document.getElementById(id);\nconst down=e=>{e.preventDefault();keys[key]=true};\nconst up=e=>{e.preventDefault();keys[key]=false};\nb.addEventListener('touchstart',down,{passive:false});\nb.addEventListener('touchend',up,{passive:false});\nb.addEventListener('touchcancel',up,{passive:false});\nb.addEventListener('mousedown',down);\nb.addEventListener('mouseup',up);\nb.addEventListener('mouseleave',up)\n}\nbind('forward','forward');bind('strafeL','strafeL');bind('strafeR','strafeR');bind('fire','fire');\n\nlet looking=false;\nlet lookLastX=0;\nc.addEventListener('pointerdown',e=>{\nif(gameOver||win){reset();return;}\nlooking=true;\nlookLastX=e.clientX;\nc.setPointerCapture(e.pointerId);\n});\nc.addEventListener('pointermove',e=>{\nif(!looking)return;\nconst dx=e.clientX-lookLastX;\nplayer.angle+=dx*0.009;\nlookLastX=e.clientX;\n});\nconst stopLook=e=>{looking=false;};\nc.addEventListener('pointerup',stopLook);\nc.addEventListener('pointercancel',stopLook);\n\nwindow.addEventListener('keydown',e=>{\nconst k=e.key.toLowerCase();\nif(k==='w')keys.forward=true;\nif(k==='a')keys.strafeL=true;\nif(k==='d')keys.strafeR=true;\nif(k==='arrowleft')player.angle-=.1;\nif(k==='arrowright')player.angle+=.1;\nif(k===' ')keys.fire=true\n});\nwindow.addEventListener('keyup',e=>{\nconst k=e.key.toLowerCase();\nif(k==='w')keys.forward=false;\nif(k==='a')keys.strafeL=false;\nif(k==='d')keys.strafeR=false;\nif(k===' ')keys.fire=false\n});\nreset();\nrequestAnimationFrame(loop);\n</script></body>`;

const flappyHtml = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;user-select:none}
html,body{width:100%;min-height:100%}
body{background:rgba(0,0,0,.12);display:flex;justify-content:center;align-items:flex-start;padding:8px;font-family:Arial,sans-serif;color:#fff}
.wrap{width:100%;max-width:520px;min-height:calc(100vh - 16px);background:rgba(25,25,35,.94);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.18);border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.header{padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.12);display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.035)}
.title{font-size:22px;font-weight:800;color:#fff}
.score-wrap{text-align:right}
.score{font-size:24px;font-weight:800;color:#73bf2e}
.best{font-size:10px;margin-top:2px;color:rgba(255,255,255,.48);letter-spacing:.8px}
.game-wrap{padding:18px;display:flex;flex-direction:column;align-items:center;gap:15px}
.board{width:100%;display:flex;justify-content:center}
canvas{background:#70c5ce;border:2px solid rgba(255,255,255,.14);border-radius:18px;display:block;width:min(100%,460px);height:auto;aspect-ratio:1/1;touch-action:none;box-shadow:inset 0 0 30px rgba(0,0,0,.15),0 8px 25px rgba(0,0,0,.22)}
.status{min-height:18px;font-size:13px;color:rgba(255,255,255,.58);text-align:center;font-weight:500}
.btn-jump{width:min(100%,320px);min-height:64px;background:rgba(115,191,46,.35);border:1px solid rgba(115,191,46,.6);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;cursor:pointer;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.12);transition:transform .08s,background .08s}
.btn-jump:active{transform:scale(.95);background:rgba(115,191,46,.65)}
</style>
</head>
<body>
<div class="wrap">
<div class="header">
<div class="title">🐤 Flappy Bird</div>
<div class="score-wrap">
<div class="score" id="score">0</div>
<div class="best" id="best">BEST 0</div>
</div>
</div>
<div class="game-wrap">
<div class="board"><canvas id="c"></canvas></div>
<div class="status" id="status">Tap tombol / layar untuk mulai</div>
<button type="button" class="btn-jump" id="jumpBtn">LOMPAT (TAP)</button>
</div>
</div>
<script>
const c=document.getElementById('c');const x=c.getContext('2d');const scoreEl=document.getElementById('score');const bestEl=document.getElementById('best');const statusEl=document.getElementById('status');
c.width=400;c.height=400;const GH=50;let bird={x:80,y:180,r:12,v:0,g:0.35,j:-6.2};let pipes=[];let score=0;let best=0;let running=false;let dead=false;let frame=0;let groundX=0;let loop=null;
function init(){clearInterval(loop);bird.y=180;bird.v=0;pipes=[];score=0;frame=0;groundX=0;dead=false;running=false;scoreEl.textContent='0';statusEl.textContent='Tap tombol / layar untuk mulai';draw();}
function flap(){if(dead){init();start();return;}if(!running){start();}bird.v=bird.j;}
function start(){if(dead)init();clearInterval(loop);running=true;statusEl.textContent='';loop=setInterval(tick,1000/60);}
function spawnPipe(){const gap=110;const minH=40;const maxH=c.height-GH-gap-minH;const topH=Math.floor(Math.random()*(maxH-minH+1))+minH;pipes.push({x:c.width,top:topH,bottom:c.height-GH-topH-gap,passed:false});}
function tick(){frame++;bird.v+=bird.g;bird.y+=bird.v;groundX=(groundX+2.2)%16;if(bird.y+bird.r>=c.height-GH||bird.y-bird.r<=0){gameOver();return;}if(frame%90===0){spawnPipe();}for(let i=pipes.length-1;i>=0;i--){let p=pipes[i];p.x-=2.2;if(bird.x+bird.r>p.x&&bird.x-bird.r<p.x+50&&(bird.y-bird.r<p.top||bird.y+bird.r>c.height-GH-p.bottom)){gameOver();return;}if(!p.passed&&p.x+50<bird.x-bird.r){p.passed=true;score++;scoreEl.textContent=score;if(score>best){best=score;bestEl.textContent='BEST '+best;}}if(p.x<-60){pipes.splice(i,1);}}draw();}
function gameOver(){clearInterval(loop);running=false;dead=true;statusEl.textContent='Game Over! Tap untuk main lagi';draw();}
function drawPipeSegment(px,py,pw,ph){x.fillStyle='#73bf2e';x.fillRect(px,py,pw,ph);x.fillStyle='#b8e986';x.fillRect(px+4,py,6,ph);x.fillStyle='#4a7c1b';x.fillRect(px+pw-8,py,6,ph);x.strokeStyle='#2e520a';x.lineWidth=2;x.strokeRect(px,py,pw,ph);}
function draw(){x.fillStyle='#70c5ce';x.fillRect(0,0,c.width,c.height);x.fillStyle='#ccebce';x.beginPath();x.arc(60,c.height-GH-20,40,Math.PI,0);x.arc(120,c.height-GH-20,60,Math.PI,0);x.arc(190,c.height-GH-20,35,Math.PI,0);x.arc(260,c.height-GH-20,55,Math.PI,0);x.arc(340,c.height-GH-20,45,Math.PI,0);x.fill();x.fillStyle='rgba(255,255,255,0.7)';x.beginPath();x.arc(80,60,18,0,Math.PI*2);x.arc(100,55,24,0,Math.PI*2);x.arc(120,60,18,0,Math.PI*2);x.fill();x.beginPath();x.arc(280,90,16,0,Math.PI*2);x.arc(300,85,22,0,Math.PI*2);x.arc(320,90,16,0,Math.PI*2);x.fill();pipes.forEach(p=>{drawPipeSegment(p.x,0,50,p.top-20);drawPipeSegment(p.x-3,p.top-20,56,20);const botY=c.height-GH-p.bottom;drawPipeSegment(p.x-3,botY,56,20);drawPipeSegment(p.x,botY+20,50,p.bottom-20);});x.fillStyle='#ded895';x.fillRect(0,c.height-GH,c.width,GH);x.fillStyle='#73bf2e';x.fillRect(0,c.height-GH,c.width,12);x.fillStyle='#538f19';for(let i=-16;i<c.width+16;i+=16){x.beginPath();x.moveTo(i-groundX,c.height-GH+12);x.lineTo(i-groundX+8,c.height-GH+12);x.lineTo(i-groundX+4,c.height-GH+20);x.fill();}x.strokeStyle='#2e520a';x.lineWidth=2;x.beginPath();x.moveTo(0,c.height-GH);x.lineTo(c.width,c.height-GH);x.moveTo(0,c.height-GH+12);x.lineTo(c.width,c.height-GH+12);x.stroke();x.save();x.translate(bird.x,bird.y);let angle=Math.min(Math.PI/4,Math.max(-Math.PI/4,bird.v*0.07));x.rotate(angle);x.fillStyle='#f8e71c';x.beginPath();x.arc(0,0,bird.r,0,Math.PI*2);x.fill();x.strokeStyle='#2e520a';x.lineWidth=2;x.stroke();x.fillStyle='#fff176';x.beginPath();x.ellipse(-4,2,6,4,0,0,Math.PI*2);x.fill();x.strokeStyle='#2e520a';x.stroke();x.fillStyle='#ffffff';x.beginPath();x.arc(4,-4,5,0,Math.PI*2);x.fill();x.strokeStyle='#2e520a';x.stroke();x.fillStyle='#000000';x.beginPath();x.arc(6,-4,2,0,Math.PI*2);x.fill();x.fillStyle='#f5a623';x.beginPath();x.arc(6,3,5,0,Math.PI*2);x.fill();x.strokeStyle='#2e520a';x.stroke();x.restore();if(dead){x.fillStyle='rgba(0,0,0,.65)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#fff';x.textAlign='center';x.font='bold 26px Arial';x.fillText('GAME OVER',c.width/2,c.height/2-10);x.font='15px Arial';x.fillText('Score: '+score,c.width/2,c.height/2+20);x.textAlign='left';}}
document.getElementById('jumpBtn').addEventListener('click',function(e){e.preventDefault();flap();});c.addEventListener('touchstart',function(e){e.preventDefault();flap();},{passive:false});c.addEventListener('mousedown',function(e){e.preventDefault();flap();});document.addEventListener('keydown',function(e){if(e.key===' '||e.key==='ArrowUp'){e.preventDefault();flap();}});init();
</script>
</body></html>`
const slotHtml = `<style> *{box-sizing:border-box;margin:0;font-family:'Segoe UI',Arial,sans-serif;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent} html,body{width:100%} body{background:radial-gradient(circle at 50% 8%,#1d6a50,#0f4938 48%,#07291f);padding:9px;color:#e9e3bc;overflow-y:auto} .machine{width:100%;max-width:420px;margin:0 auto;position:relative;padding:10px 12px 12px;border:4px solid #b9954d;border-radius:26px;background:linear-gradient(110deg,#061e17,#1b644b 12%,#0b382a 30%,#15543f 55%,#092f24 80%,#28775a 94%,#071f18);box-shadow:inset 0 0 0 3px #163f31,inset 0 16px 26px #73d2a31f,0 8px 0 #041a13,0 16px 24px #000c} .lights{height:9px;margin:0 12px 7px;border:2px solid #123d2f;border-radius:8px;background:repeating-radial-gradient(circle at 6px 50%,#dfffdc 0 2px,#82c878 3px 5px,#164936 6px 12px);box-shadow:0 0 12px #67b881;animation:blink .55s steps(2) infinite} .title{padding:10px 4px 8px;border:3px solid #b99a54;border-radius:16px 16px 11px 11px;color:#e9e3bc;background:radial-gradient(ellipse at 50% 0,#2b8a6c,#11513f 60%,#082a24);text-align:center;font:900 25px Impact,'Arial Black',sans-serif;letter-spacing:1px;text-shadow:0 3px #193f31,0 0 12px #7ddc8a66} .jack{width:76%;margin:6px auto;padding:3px;border:2px solid #a98c4d;border-radius:9px;color:#ded7ad;background:linear-gradient(#245d48,#0b3025);text-align:center;font:bold 10px monospace;letter-spacing:1px} .stats{display:flex;margin:0 2px 8px;padding:5px;border:2px solid #537d64;border-radius:9px;background:linear-gradient(#102d24,#061812);box-shadow:inset 0 0 9px #000} .stats div{flex:1;border-right:1px solid #416452;text-align:center;font:bold 10px monospace;color:#91b59f} .stats div:last-child{border:0} .stats b{display:block;margin-top:2px;font-size:15px;color:#e3dfbb;text-shadow:0 0 6px #62a77d} .frame{padding:8px;border:4px solid #315c47;border-radius:16px;background:linear-gradient(90deg,#09271e,#b49a59 5%,#174936 10%,#174936 90%,#b49a59 95%,#09271e);box-shadow:inset 0 0 0 3px #071b15,0 4px 0 #09271e,0 8px 15px #000a} #reels{display:grid;grid-template-columns:repeat(5,1fr);height:192px;overflow:hidden;border:3px solid #071c15;border-radius:10px;background:#071a14;box-shadow:inset 0 12px 18px #0009,inset 0 -12px 18px #0009} .reel{position:relative;overflow:hidden;background:linear-gradient(90deg,#8f6a39,#fff8d8 17%,#fffdf0 50%,#f0dfad 82%,#79552c);box-shadow:inset 7px 0 8px #573b1d55,inset -7px 0 8px #573b1d55} .reel+.reel{border-left:2px solid #573512} .reel:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(#1c0d05bb 0,transparent 18%,transparent 80%,#281208cc 100%)} .strip{will-change:transform} .strip.moving{filter:blur(1.4px) saturate(1.2)} .sym{height:64px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #9f7e4f44;font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif;font-size:40px;line-height:1;text-shadow:0 3px 0 #72101822,0 0 4px #fff} .s7{font:900 42px Impact,'Arial Black',sans-serif;color:#ef1726;-webkit-text-stroke:2px #850815;text-shadow:0 3px #5d0509,0 0 5px #fff} .sbar{width:52px;height:22px;display:flex;align-items:center;justify-content:center;font:900 12px 'Arial Black',sans-serif;color:#fff4c4;background:radial-gradient(ellipse at center,#e22d35 0,#6f0910 55%,transparent 56%);text-shadow:0 2px #401010} .win{animation:winP .5s ease-in-out infinite;background:radial-gradient(circle,#fff8a9,#ffae00 55%,transparent 72%)} @keyframes winP{50%{transform:scale(1.09);filter:brightness(1.4)}} .message{height:34px;margin:9px 2px 7px;display:flex;align-items:center;justify-content:center;border:2px solid #537d64;border-radius:8px;background:linear-gradient(#102d24,#061812);box-shadow:inset 0 0 8px #000;color:#e3dfbb;font:bold 14px monospace;text-shadow:0 0 7px #62a77d;text-align:center} .console{display:grid;grid-template-columns:46px 1fr 1.8fr;gap:8px;margin:0 3px;padding:9px 8px 11px;border:3px solid #416a53;border-radius:9px 9px 16px 16px;background:linear-gradient(#9c8c59,#315d48 37%,#0a2e22 39%,#123e2f);box-shadow:inset 0 2px #d9c992,0 6px #061d16,0 12px 18px #0009} button{height:53px;border:3px solid #0b2e22;border-radius:13px;color:#fff;font-weight:900;cursor:pointer;touch-action:manipulation} .mute{background:linear-gradient(#d9b04a,#8a6d08 55%,#5d4805);box-shadow:0 4px #3d2f02;font-size:18px} .bet{background:linear-gradient(#4f9a77,#216348 53%,#103d2d);box-shadow:inset 0 4px 4px #d8ffe055,0 4px #092a20} .spin{background:radial-gradient(circle at 50% 32%,#a8d96f,#4b8d46 47%,#1e542f 76%);box-shadow:inset 0 4px 5px #e8ffd488,0 4px #12351e,0 0 14px #79b85c88;font-size:18px;text-shadow:0 2px #06420d} button:disabled{filter:saturate(.4) brightness(.75)} .tray{width:48%;height:17px;margin:13px auto 0;border:4px solid #244d3a;border-radius:4px 4px 10px 10px;background:#061a13;box-shadow:inset 0 6px 9px #000,0 3px #897945} .winner .lights{animation-duration:.16s} .winner .title{animation:winP .6s ease-in-out 2} .over{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border-radius:20px;background:#03150eec;color:#ffe5a0;text-align:center} .over.off{display:none} .over h2{margin:0 0 6px;font-size:24px;color:#ff3449;text-shadow:0 0 12px #f00} .over p{font-size:13px;color:#cfe6c8} .over button{padding:0 22px;height:40px;background:#ffd15a;color:#271204} @keyframes blink{50%{filter:brightness(1.7)}} </style> <div class="machine" id="machine"> <div class="lights"></div> <div class="title">FRUIT BONANZA</div> <div class="jack">JACKPOT · 10.000 CREDITS</div> <div class="stats"><div>CREDITS<b id="credits">500</b></div><div>BET<b id="betValue">10</b></div><div>BEST WIN<b id="best">0</b></div></div> <div class="frame"><div id="reels"></div></div> <div id="message" class="message">SPIN UNTUK MULAI</div> <div class="console"><button id="mute" class="mute">🔊</button><button id="bet" class="bet">BET +</button><button id="spin" class="spin">🎰 SPIN</button></div> <div class="tray"></div> <div id="over" class="over off"><h2>GAME OVER</h2><p>Credits habis!<br>Best Win: <b id="finalBest">0</b></p><button id="restart">MAIN LAGI</button></div> </div> <script> (function(){ var AC=null,MUTED=false; try{MUTED=localStorage.getItem('slot_mute')==='1'}catch(e){} function ac(){ if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}} if(AC.state==='suspended'){try{AC.resume()}catch(e){}} return AC; } function tone(f,dur,type,vol,delay,slide){ var a=ac();if(!a||MUTED)return; try{ var t=a.currentTime+(delay||0); var o=a.createOscillator(),g=a.createGain(); o.type=type||'square'; o.frequency.setValueAtTime(f,t); if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur); g.gain.setValueAtTime(vol||.12,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g);g.connect(a.destination); o.start(t);o.stop(t+dur+.03); }catch(e){} } function sndClick(){tone(650,.05,'square',.08)} function sndSpin(){tone(700,.28,'sawtooth',.06,0,150);for(var i=0;i<8;i++)tone(170,.03,'square',.05,.1+i*.1)} function sndStop(c){tone(150+c*35,.09,'square',.16)} function sndWin(){[660,880,1100].forEach(function(f,i){tone(f,.14,'triangle',.14,i*.09)})} function sndJackpot(){[523,659,784,1046,784,1046,1318,1568].forEach(function(f,i){tone(f,.16,'square',.12,i*.11);tone(f/2,.16,'triangle',.08,i*.11)})} function sndLose(){tone(220,.2,'sawtooth',.07);tone(160,.3,'sawtooth',.07,.14)} function sndOver(){[392,330,262,196].forEach(function(f,i){tone(f,.3,'triangle',.12,i*.28)})} document.addEventListener('pointerdown',function(){ac()},{once:true}); var SY=['🍒','🍋','🔔','💎','7','BAR'],WT=[30,25,18,12,8,7],PAY=[2,3,5,8,12,20],SH=64,LEN=10,OFF=7, credits=500,bet=10,best=0,busy=false,reels=[], C=document.getElementById('credits'),BV=document.getElementById('betValue'),BS=document.getElementById('best'), MSG=document.getElementById('message'),SP=document.getElementById('spin'),BT=document.getElementById('bet'), MUB=document.getElementById('mute'), OV=document.getElementById('over'),FB=document.getElementById('finalBest'),MCH=document.getElementById('machine'); function pick(){var n=Math.random()*100,s=0;for(var i=0;i<6;i++){s+=WT[i];if(n<s)return i}return 0} function symHTML(v){return '<div class="sym">'+(v===4?'<i class="s7">7</i>':v===5?'<i class="sbar">BAR</i>':SY[v])+'</div>'} function ui(){C.textContent=credits;BV.textContent=bet;BS.textContent=best} function msg(t){MSG.textContent=t} function clearWin(){for(var c=0;c<5;c++)for(var i=OFF;i<LEN;i++)reels[c].strip.children[i].classList.remove('win')} function spin(){ if(busy||credits<bet)return;busy=true;clearWin();credits-=bet;ui(); SP.disabled=true;BT.disabled=true;msg('GOOD LUCK ✨');sndSpin(); for(var c=0;c<5;c++){ var r=reels[c],vals=[],h=''; for(var i=0;i<LEN;i++)vals.push(pick()); for(var i=0;i<LEN;i++)h+=symHTML(vals[i]); r.vals=vals;r.strip.innerHTML=h; r.strip.style.transition='none';r.strip.style.transform='translateY(0)'; r.strip.offsetHeight; var dur=1.05+c*0.22; r.strip.classList.add('moving'); r.strip.style.transition='transform '+dur+'s cubic-bezier(.12,.75,.25,1)'; r.strip.style.transform='translateY(-'+(OFF*SH)+'px)'; (function(st,d,ix){setTimeout(function(){st.classList.remove('moving');sndStop(ix)},d*1000)})(r.strip,dur,c); } setTimeout(evalBoard,2150); } function evalBoard(){ var grid=[];for(var c=0;c<5;c++)grid.push(reels[c].vals.slice(OFF)); var lines=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]],total=0,wc=[]; lines.forEach(function(p){ var a=grid[0][p[0]],n=1; for(var x=1;x<5&&grid[x][p[x]]===a;x++)n++; if(n>=3){total+=Math.floor(bet*PAY[a]*(n===3?1:n===4?2:5)); for(var i=0;i<n;i++)wc.push([i,p[i]])} }); if(total){ credits+=total;best=Math.max(best,total); wc.forEach(function(w){reels[w[0]].strip.children[OFF+w[1]].classList.add('win')}); msg(total>=bet*20?'🎰 JACKPOT +'+total:'✨ MENANG +'+total); MCH.classList.add('winner');setTimeout(function(){MCH.classList.remove('winner')},1800); if(total>=bet*20)sndJackpot();else sndWin(); }else{msg('💦 BELUM HOKI!');sndLose()} SP.disabled=false;BT.disabled=false;busy=false;ui(); if(credits<10)setTimeout(gameover,900); else if(bet>credits){bet=10;ui()} } function gameover(){FB.textContent=best;OV.className='over';sndOver()} BT.onclick=function(){if(busy)return;sndClick();bet=bet===10?20:bet===20?50:10;if(bet>credits)bet=10;ui()}; SP.onclick=spin; MUB.onclick=function(){ MUTED=!MUTED;MUB.textContent=MUTED?'🔇':'🔊'; try{localStorage.setItem('slot_mute',MUTED?'1':'0')}catch(e){} if(!MUTED)sndClick(); }; if(MUTED)MUB.textContent='🔇'; document.getElementById('restart').onclick=function(){sndClick();credits=500;bet=10;best=0;busy=false;OV.className='over off';msg('SPIN UNTUK MULAI');SP.disabled=false;BT.disabled=false;clearWin();ui()}; var box=document.getElementById('reels'); for(var c=0;c<5;c++){ var d=document.createElement('div');d.className='reel'; var s=document.createElement('div');s.className='strip'; d.appendChild(s);box.appendChild(d); var h='';for(var i=0;i<LEN;i++)h+=symHTML(pick()); s.innerHTML=h;s.style.transform='translateY(-'+(OFF*SH)+'px)'; reels.push({strip:s,vals:[0,0,0]}); } ui(); })(); </script>`

async function htmlGoon(sock, jid) {
  const botResponseId = crypto.randomUUID();

  const payloadData = {
    response_id: botResponseId,
    sections: [
      {
        view_model: {
          primitive: {
            text: '> RennZSync',
            __typename: 'GenAIMarkdownTextUXPrimitive'
          },
          __typename: 'GenAISingleLayoutViewModel'
        }
      }
    ],
    embedded_screens: [
      {
        title: 'Preview',
        content: [
          {
            __typename: 'FOAIDNixelButtonSheets',
            tabs: [
              {
                id: 'tab_0',
                tab_header: 'Dino Runner',
                sections: [
                  {
                    __typename: 'GenAIUnifiedResponseSection',
                    view_model: {
                      __typename: 'GenAISingleLayoutViewModel',
                      primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: dinoHtml.trim(),
                        url: 'https://renz.dev',
                        trusted_sources: ['renz.dev']
                      }
                    }
                  }
                ],
                step_entries: []
              },
              {
                id: 'tab_1',
                tab_header: 'Tic Tac Toe',
                sections: [
                  {
                    __typename: 'GenAIUnifiedResponseSection',
                    view_model: {
                      __typename: 'GenAISingleLayoutViewModel',
                      primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: tttHtml.trim(),
                        url: 'https://renz.dev',
                        trusted_sources: ['renz.dev']
                      }
                    }
                  }
                ],
                step_entries: []
              },
              {
                id: 'tab_2',
                tab_header: 'Doom',
                sections: [
                  {
                    __typename: 'GenAIUnifiedResponseSection',
                    view_model: {
                      __typename: 'GenAISingleLayoutViewModel',
                      primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: doomHtml.trim(),
                        url: 'https://renz.dev',
                        trusted_sources: ['renz.dev']
                      }
                    }
                  }
                ],
                step_entries: []
              },
              {
                id: 'tab_3',
                tab_header: 'flappy',
                sections: [
                  {
                    __typename: 'GenAIUnifiedResponseSection',
                    view_model: {
                      __typename: 'GenAISingleLayoutViewModel',
                      primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: flappyHtml.trim(),
                        url: 'https://renz.dev',
                        trusted_sources: ['renz.dev']
                      }
                    }
                  }
                ],
                step_entries: []
              },         
              {
                id: 'tab_4',
                tab_header: 'slot',
                sections: [
                  {
                    __typename: 'GenAIUnifiedResponseSection',
                    view_model: {
                      __typename: 'GenAISingleLayoutViewModel',
                      primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: slotHtml.trim(),
                        url: 'https://renz.dev',
                        trusted_sources: ['renz.dev']
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
    ]
  };

  if (typeof airich === 'function') {
    return await airich(sock, jid, payloadData);
  }

  const messagePayload = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: '',
        botResponseId: botResponseId,
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: 1,
              signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YY28GDo8OXSlgg==',
              certificateChain: [
                'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGE663ESCbLizCieg4wPebEFhVgH2dAgtZ8ajRuM4EY9p4BB4ay1X8InJh4KPu2GGhxlhPifhj3TFWzDND9OoPAx9ngvHgJ7qW+qq4UWIO3BxUoSc1UlkrSRYrDad3Oddz6dbHJqguhpE4JQ9nTyVT3lFWnuMg2oBEXG2mkdFR1fOnKG03454VeAGFLQfQMoAlq7AfmTFVXn45X8kMduwwCFuSE3sIF8uAMhP5Ng1Rn+mMmGZfne5RsyCa4wuHhv9p5KVKgnP8NXF6Sv6kAx5Dcer/qxZRaofRXTp7kSenmU+HU1w9KQfsEpHdbsfoRXKsscYm2KYl45U+FaFWbdaM1SXso3kE7SmMbNNCoJyX1ra8qoCXn940lJ3NjAb/7V6FjV7kHXXQycABxEtM7f3XaWzBMAnHMv43vTYv0g14snH90OpBPAJoOqA9Fhd+7636dOAT1pEQfCaghq/oSE2+/c0pbXK20WxtrzJnGRO6Kiy3R9KWMiPlbQu5Npoiu25PMFqujhoZiteQY3EoQnxLCHWZuV7ozseUrnfCbSGuzIvvd2iwx3z7k2Vlh5+vuiM9/j6/tstk5KG0AhP/G4aOAnbQfnowH1jpCC51Onnoz9eXDBwYOmA/QCiLgIL9PcJUoMPERaX0bp3Oy5q77VNVzFhIWFWVukfWn7uNmZgKFqfPzLAiy5nBEwfSrf23tmXxjbF0131XO1KbraDB0TVktoWMF45Y2U81rB4yD7WR+MFxMRaA3EF+jC6i/+giHnUHRhb3F4BF3derq03u1EmegX6dnt43U5dnSZmJb9pmQslhBaFlWJqRK82gqfdRtT5r4Q/wamUUgrIGjS'
              ]
            }
          ]
        }
      }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            {
              messageType: 2,
              messageText: '> RennZSync'
            }
          ],
          unifiedResponse: {
            data: Buffer.from(JSON.stringify(payloadData)).toString('base64')
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: '867051314767696@bot'
            },
            forwardOrigin: 4
          }
        }
      }
    }
  };

  const msg = generateWAMessageFromContent(jid, messagePayload, {});
  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });

  const editMsg = generateWAMessageFromContent(
    jid,
    {
      botForwardedMessage: {
        message: {
          protocolMessage: {
            key: {
              remoteJid: jid,
              fromMe: true,
              id: msg.key.id
            },
            type: 14,
            editedMessage: messagePayload
          }
        }
      }
    },
    {}
  );

  await sock.relayMessage(jid, editMsg.message, { messageId: editMsg.key.id });

  return msg;
}


let handler = async (m, { conn }) => {
  await htmlGoon(conn, m.chat);
};

handler.help = ['gameall', 'games'];
handler.tags = ['game'];
handler.command = ['gameall', 'games'];

export default handler;
