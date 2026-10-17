// p5.js：題庫載入、隨機抽題、互動與愛心煙火特效
let bank=[], roundQuestions=[], index=0, correctCount=0, answered=false;
let particles=[], celebration='', cheerStart=0, stickFont;
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6MA6R1TbrTitEJGxlWYJqhVOonQ7A8ZO5oXgRpJgUX91I4rF9ib7NXru77CfvzyBNBV4D6l_sbL3t/pub?gid=1022215572&single=true&output=csv';
const $=id=>document.getElementById(id);
function preload(){stickFont=loadFont('assets/Stick-Regular.ttf');}
function setup(){const c=createCanvas(windowWidth,windowHeight);c.parent('canvas-layer');c.style('display','block');pixelDensity(Math.min(devicePixelRatio,2));textFont('Noto Sans TC');textStyle(BOLD);$('next').addEventListener('click',advance);$('retry').addEventListener('click',loadQuestions);loadQuestions();}
async function loadQuestions(){
  $('error').classList.add('hidden');$('result').classList.add('hidden');$('options').classList.add('hidden');$('next').classList.add('hidden');$('feedback').textContent='';
  $('question').classList.remove('hidden');$('question').textContent='正在從 Google 試算表更新題庫…';$('retry').disabled=true;
  try{
    const separator=SHEET_CSV_URL.includes('?')?'&':'?';
    const response=await fetch(SHEET_CSV_URL+separator+'_ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const csv=await response.text();
    const parsed=Papa.parse(csv.replace(/^\uFEFF/,''),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()});
    if(parsed.errors.length && !parsed.data.length)throw new Error('CSV 格式錯誤');
    bank=parsed.data.map(row=>({question:(row.question||'').trim(),options:['A','B','C','D'].map(k=>(row[k]||'').trim()),answer:(row.answer||'').trim().toUpperCase(),explanation:(row.explanation||'').trim()})).filter(q=>q.question&&q.options.every(Boolean)&&'ABCD'.includes(q.answer)&&q.answer.length===1);
    if(bank.length<5)throw new Error('題庫至少需要 5 題有效資料，請確認欄位名稱為 question、A、B、C、D、answer、explanation。');
    startRound();
  }catch(err){showError('Google 試算表題庫讀取失敗：'+err.message+'。請確認試算表已發布到網路，並使用 Live Server 或 HTTPS 網站開啟。');$('options').classList.add('hidden');$('result').classList.remove('hidden');$('result-emoji').textContent='📡';$('result-title').textContent='題庫暫時無法更新';$('result-count').textContent='';$('result-score').textContent='';$('result-message').textContent='請檢查網路及 Google 試算表發布設定，再按下方按鈕重試。';}
  finally{$('retry').disabled=false;}
}
function showError(msg){$('error').textContent=msg;$('error').classList.remove('hidden');$('question').textContent='無法載入測驗';}
function startRound(){celebration='';particles=[];index=0;correctCount=0;answered=false;roundQuestions=shuffle([...bank]).slice(0,5);$('result').classList.add('hidden');$('options').classList.remove('hidden');$('question').classList.remove('hidden');$('next').classList.add('hidden');$('error').classList.add('hidden');$('round').textContent='🌴 泰國旅遊挑戰';showQuestion();}
function showQuestion(){answered=false;const q=roundQuestions[index];$('progress').textContent=`第 ${index+1} / 5 題`;$('progress-bar').style.width=`${(index+1)*20}%`;$('question').textContent=`Q${index+1}. ${q.question}`;$('feedback').textContent='';$('next').classList.add('hidden');$('options').replaceChildren();q.options.forEach((opt,i)=>{const key='ABCD'[i],b=document.createElement('button');b.type='button';b.className='option';const letter=document.createElement('span');letter.className='letter';letter.textContent=key;const label=document.createElement('span');label.textContent=opt;b.append(letter,label);b.addEventListener('click',()=>choose(key,b));$('options').append(b);});}
function choose(key,button){if(answered)return;answered=true;const q=roundQuestions[index];const ok=key===q.answer;if(ok){correctCount++;button.classList.add('correct');$('feedback').textContent='✨ 答對了！'+q.explanation;}else{button.classList.add('wrong');$('feedback').textContent=`💡 正確答案是 ${q.answer}。${q.explanation}`;}$('options').querySelectorAll('button').forEach(b=>b.disabled=true);$('next').textContent=index===4?'查看成績 🎉':'下一題 →';$('next').classList.remove('hidden');}
function advance(){if(index<4){index++;showQuestion();}else showResult();}
function showResult(){$('question').classList.add('hidden');$('options').classList.add('hidden');$('next').classList.add('hidden');$('feedback').textContent='';$('progress').textContent='挑戰完成';$('progress-bar').style.width='100%';$('result').classList.remove('hidden');const score=correctCount*20,passed=score>=60;$('result-emoji').textContent=passed?'💖🎆':'💪🌈';$('result-title').textContent=passed?'太棒了！泰國旅遊達人！':'繼續加油，下次會更棒！';$('result-count').textContent=`答對題數：${correctCount} / 5 題`;$('result-score').textContent=`總成績：${score} 分`;$('result-message').innerHTML=passed?'恭喜達成 60 分門檻！愛心煙火送給你 💗':'<span class="cheer">加油！你一定可以！ 🌟</span>';celebration=passed?'fireworks':'cheer';cheerStart=millis();}
function windowResized(){resizeCanvas(windowWidth,windowHeight);}
function draw(){clear();if(celebration==='fireworks'){if(frameCount%18===0)spawnHeart(random(width*.15,width*.85),random(height*.15,height*.75));for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.028;p.life-=2.2;noStroke();fill(p.color[0],p.color[1],p.color[2],p.life);circle(p.x,p.y,p.size);if(p.life<=0)particles.splice(i,1);}}else if(celebration==='cheer'){push();textAlign(CENTER,CENTER);textFont(stickFont);textStyle(BOLD);let s=1+Math.min((millis()-cheerStart)/6500,1.5);textSize(Math.min(width*.13,70)*s);fill(240,120,150,110);text('加油 ♥',width/2,height*.16);pop();textFont('Noto Sans TC');textStyle(BOLD);}}
function spawnHeart(cx,cy){const palette=[[255,120,165],[205,180,219],[255,175,204],[255,210,105]];const col=random(palette);for(let i=0;i<90;i++){const t=TWO_PI*i/90;const hx=16*pow(sin(t),3),hy=-(13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t));const speed=random(.09,.17);particles.push({x:cx,y:cy,vx:hx*speed,vy:hy*speed,life:255,size:random(2.5,5.5),color:col});}}
