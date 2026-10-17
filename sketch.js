// ============================================================
// 泰好玩！曼谷 × 清邁旅遊知識挑戰
// ============================================================
//
// 功能：
// 1. Google Sheets 雲端題庫
// 2. 每回合隨機抽選 5 題
// 3. 答對選項上下跳動
// 4. 答錯選項左右晃動
// 5. 60 分以上播放愛心煙火
// 6. 未達 60 分顯示放大的加油動畫
// 7. 支援電腦、平板及手機響應式畫面
//
// 字型：Google Fonts - Noto Sans TC
//
// ============================================================


// ============================================================
// 1. Google Sheets 題庫網址
// ============================================================

// Google Sheets 發布為 CSV 的網址
// 未來如果更換試算表，只需要修改這個網址

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6MA6R1TbrTitEJGxlWYJqhVOonQ7A8ZO5oXgRpJgUX91I4rF9ib7NXru77CfvzyBNBV4D6l_sbL3t/pub?gid=1022215572&single=true&output=csv';


// ============================================================
// 2. 測驗基本設定
// ============================================================

// 每回合題數
const QUESTIONS_PER_ROUND = 5;

// 每題分數
const POINTS_PER_QUESTION = 20;

// 通過分數
const PASS_SCORE = 60;

// Google Fonts 字型名稱
const QUIZ_FONT = 'Noto Sans TC';


// ============================================================
// 3. 全域變數
// ============================================================

// 完整題庫
let bank = [];

// 本回合抽出的題目
let roundQuestions = [];

// 目前題目索引
let questionIndex = 0;

// 答對題數
let correctCount = 0;

// 是否已經作答
let answered = false;

// 題庫是否正在載入
let isLoading = false;

// 動畫粒子
let particles = [];

// 動畫狀態
// ''          = 無動畫
// 'fireworks' = 愛心煙火
// 'cheer'     = 加油動畫

let celebration = '';

// 加油動畫開始時間
let cheerStart = 0;

// 愛心煙火生成時間
let lastFireworkTime = 0;

// 避免連續點擊產生重複請求
let loadRequestId = 0;


// ============================================================
// 4. HTML 元素快速取得
// ============================================================

// 例如：
// $('question') 等同於
// document.getElementById('question')

const $ = id => document.getElementById(id);


// ============================================================
// 5. p5.js 初始化
// ============================================================

function setup() {

  // 建立全螢幕動畫畫布
  const canvas = createCanvas(
    windowWidth,
    windowHeight
  );

  // 將畫布放入 HTML 的 canvas-layer
  canvas.parent('canvas-layer');

  // 設定畫布顯示方式
  canvas.style('display', 'block');

  // 限制像素密度，避免高解析度手機過度耗能
  pixelDensity(
    Math.min(window.devicePixelRatio || 1, 2)
  );

  // 使用 Google Fonts
  // 不再載入本機 Stick 字型
  textFont(QUIZ_FONT);

  // 設定 p5.js 動畫文字為粗體
  textStyle(BOLD);

  // 設定文字對齊
  textAlign(CENTER, CENTER);

  // 下一題按鈕
  $('next').addEventListener(
    'click',
    advance
  );

  // 再答一次按鈕
  $('retry').addEventListener(
    'click',
    loadQuestions
  );

  // 初次載入 Google Sheets 題庫
  loadQuestions();
}


// ============================================================
// 6. Google Sheets 題庫讀取
// ============================================================

async function loadQuestions() {

  // 防止重複載入
  if (isLoading) return;

  isLoading = true;

  // 記錄本次請求
  const requestId = ++loadRequestId;

  // 停止原本動畫
  celebration = '';

  // 清除煙火粒子
  particles = [];

  // 隱藏錯誤訊息
  $('error').classList.add('hidden');

  // 隱藏成績
  $('result').classList.add('hidden');

  // 隱藏選項
  $('options').classList.add('hidden');

  // 隱藏下一題
  $('next').classList.add('hidden');

  // 清除答題回饋
  $('feedback').textContent = '';

  // 顯示題目區域
  $('question').classList.remove('hidden');

  // 顯示載入訊息
  $('question').textContent =
    '🌴 正在從 Google 試算表載入最新題庫…';

  // 更新進度
  $('progress').textContent = '題庫載入中';

  // 清空進度條
  $('progress-bar').style.width = '0%';

  // 暫時停用重新測驗按鈕
  $('retry').disabled = true;

  try {

    // --------------------------------------------------------
    // 6-1. 避免瀏覽器使用舊的快取
    // --------------------------------------------------------

    // 在網址後方加入時間戳記
    // 每次讀取都會產生不同的請求網址

    const separator =
      SHEET_CSV_URL.includes('?') ? '&' : '?';

    const url =
      SHEET_CSV_URL +
      separator +
      '_ts=' +
      Date.now();


    // --------------------------------------------------------
    // 6-2. 使用 fetch() 讀取 Google Sheets
    // --------------------------------------------------------

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store'
    });

    // 檢查 HTTP 狀態
    if (!response.ok) {
      throw new Error(
        'HTTP 錯誤：' + response.status
      );
    }

    // 取得 CSV 文字
    const csv = await response.text();


    // --------------------------------------------------------
    // 6-3. 使用 PapaParse 解析 CSV
    // --------------------------------------------------------

    const parsed = Papa.parse(
      csv.replace(/^\uFEFF/, ''),
      {
        header: true,

        // 忽略空白列
        skipEmptyLines: 'greedy',

        // 去除欄位名稱前後空白
        transformHeader: header => header.trim()
      }
    );


    // --------------------------------------------------------
    // 6-4. 檢查 CSV 是否正確
    // --------------------------------------------------------

    if (
      parsed.errors.length > 0 &&
      parsed.data.length === 0
    ) {
      throw new Error('CSV 題庫格式錯誤');
    }

    // 必要欄位
    const requiredColumns = [
      'question',
      'A',
      'B',
      'C',
      'D',
      'answer'
    ];

    // 取得實際欄位
    const actualColumns = parsed.meta.fields || [];

    // 找出缺少的欄位
    const missingColumns = requiredColumns.filter(
      column => !actualColumns.includes(column)
    );

    if (missingColumns.length > 0) {

      throw new Error(
        'Google Sheets 缺少欄位：' +
        missingColumns.join('、')
      );

    }


    // --------------------------------------------------------
    // 6-5. 將 CSV 轉換為測驗題庫
    // --------------------------------------------------------

    const newBank = parsed.data.map(row => {

      return {

        // 題目內容
        question: String(
          row.question || ''
        ).trim(),

        // A～D 四個選項
        options: ['A', 'B', 'C', 'D'].map(
          key => String(row[key] || '').trim()
        ),

        // 正確答案
        answer: String(
          row.answer || ''
        ).trim().toUpperCase(),

        // 答案解析
        explanation: String(
          row.explanation || ''
        ).trim()

      };

    });


    // --------------------------------------------------------
    // 6-6. 過濾無效題目
    // --------------------------------------------------------

    bank = newBank.filter(q => {

      // 題目不可空白
      const hasQuestion =
        q.question.length > 0;

      // 四個選項都必須有內容
      const hasOptions =
        q.options.every(option => option.length > 0);

      // 答案只能是 A、B、C、D
      const validAnswer =
        ['A', 'B', 'C', 'D'].includes(q.answer);

      return (
        hasQuestion &&
        hasOptions &&
        validAnswer
      );

    });


    // --------------------------------------------------------
    // 6-7. 確認題庫數量
    // --------------------------------------------------------

    if (bank.length < QUESTIONS_PER_ROUND) {

      throw new Error(
        '有效題目不足 5 題，目前只有 ' +
        bank.length +
        ' 題。'
      );

    }

    // 確認這是最新的請求
    if (requestId !== loadRequestId) return;

    // 題庫載入成功
    console.log(
      'Google Sheets 題庫載入成功，共 ' +
      bank.length +
      ' 題'
    );

    // 開始測驗
    startRound();

  } catch (error) {

    console.error(
      'Google Sheets 題庫讀取失敗：',
      error
    );

    // 顯示錯誤
    showError(
      'Google 試算表題庫讀取失敗：' +
      error.message +
      '。請確認試算表已發布到網路，並使用 Live Server 或 HTTPS 網站開啟。'
    );

    // 顯示重試畫面
    showLoadErrorResult();

  } finally {

    // 結束載入狀態
    isLoading = false;

    // 恢復按鈕
    $('retry').disabled = false;

  }

}


// ============================================================
// 7. 顯示錯誤訊息
// ============================================================

function showError(message) {

  $('error').textContent = message;

  $('error').classList.remove('hidden');

  $('question').textContent =
    '⚠️ 無法載入測驗';

}


// ============================================================
// 8. 題庫讀取失敗畫面
// ============================================================

function showLoadErrorResult() {

  // 隱藏選項
  $('options').classList.add('hidden');

  // 顯示結果區域
  $('result').classList.remove('hidden');

  // 錯誤圖示
  $('result-emoji').textContent = '📡';

  // 標題
  $('result-title').textContent =
    '題庫暫時無法更新';

  // 清除成績
  $('result-count').textContent = '';

  $('result-score').textContent = '';

  // 提示文字
  $('result-message').textContent =
    '請檢查網路及 Google 試算表發布設定，再按下方按鈕重試。';

}


// ============================================================
// 9. 開始新回合
// ============================================================

function startRound() {

  // 停止動畫
  celebration = '';

  // 清除粒子
  particles = [];

  // 重設題目索引
  questionIndex = 0;

  // 重設答對題數
  correctCount = 0;

  // 重設作答狀態
  answered = false;


  // ----------------------------------------------------------
  // 9-1. 隨機抽選 5 題
  // ----------------------------------------------------------

  // 複製題庫後打亂順序
  // 避免修改原始題庫

  const shuffledBank = shuffle([...bank]);

  // 取出前五題
  roundQuestions = shuffledBank.slice(
    0,
    QUESTIONS_PER_ROUND
  );


  // ----------------------------------------------------------
  // 9-2. 重設測驗畫面
  // ----------------------------------------------------------

  $('result').classList.add('hidden');

  $('options').classList.remove('hidden');

  $('question').classList.remove('hidden');

  $('next').classList.add('hidden');

  $('error').classList.add('hidden');

  $('round').textContent =
    '🌴 泰國旅遊挑戰';

  // 顯示第一題
  showQuestion();

}


// ============================================================
// 10. 顯示題目
// ============================================================

function showQuestion() {

  // 重設作答狀態
  answered = false;

  // 取得目前題目
  const q = roundQuestions[questionIndex];


  // ----------------------------------------------------------
  // 10-1. 顯示題目進度
  // ----------------------------------------------------------

  $('progress').textContent =
    `第 ${questionIndex + 1} / ${QUESTIONS_PER_ROUND} 題`;

  // 更新進度條
  $('progress-bar').style.width =
    `${((questionIndex + 1) / QUESTIONS_PER_ROUND) * 100}%`;


  // ----------------------------------------------------------
  // 10-2. 顯示題目文字
  // ----------------------------------------------------------

  $('question').textContent =
    `Q${questionIndex + 1}. ${q.question}`;


  // ----------------------------------------------------------
  // 10-3. 清除上一題狀態
  // ----------------------------------------------------------

  $('feedback').textContent = '';

  $('next').classList.add('hidden');

  // 清除舊選項
  $('options').replaceChildren();


  // ----------------------------------------------------------
  // 10-4. 建立 A～D 四個選項
  // ----------------------------------------------------------

  q.options.forEach((optionText, i) => {

    // 選項代號
    const key = 'ABCD'[i];

    // 建立按鈕
    const button = document.createElement('button');

    button.type = 'button';

    button.className = 'option';


    // --------------------------------------------------------
    // 建立選項字母
    // --------------------------------------------------------

    const letter = document.createElement('span');

    letter.className = 'letter';

    letter.textContent = key;


    // --------------------------------------------------------
    // 建立選項文字
    // --------------------------------------------------------

    const label = document.createElement('span');

    label.textContent = optionText;


    // --------------------------------------------------------
    // 將字母及文字放入按鈕
    // --------------------------------------------------------

    button.append(letter, label);


    // --------------------------------------------------------
    // 設定選項點擊事件
    // --------------------------------------------------------

    button.addEventListener('click', () => {

      choose(key, button);

    });


    // 將選項加入畫面
    $('options').append(button);

  });

}


// ============================================================
// 11. 使用者選擇答案
// ============================================================

function choose(key, button) {

  // 已作答就不再處理
  if (answered) return;

  answered = true;

  // 取得目前題目
  const q = roundQuestions[questionIndex];

  // 判斷是否答對
  const isCorrect = key === q.answer;


  // ----------------------------------------------------------
  // 11-1. 答對處理
  // ----------------------------------------------------------

  if (isCorrect) {

    // 答對題數加一
    correctCount++;

    // 加入答對 CSS 類別
    // 背景 #cdb4db
    // 上下跳動

    button.classList.add('correct');

    // 顯示答對訊息
    $('feedback').textContent =
      '✨ 答對了！' + q.explanation;

  }


  // ----------------------------------------------------------
  // 11-2. 答錯處理
  // ----------------------------------------------------------

  else {

    // 加入答錯 CSS 類別
    // 背景 #bde0fe
    // 左右晃動

    button.classList.add('wrong');

    // 顯示正確答案
    $('feedback').textContent =
      `💡 正確答案是 ${q.answer}。${q.explanation}`;

  }


  // ----------------------------------------------------------
  // 11-3. 禁止重複作答
  // ----------------------------------------------------------

  $('options')
    .querySelectorAll('button')
    .forEach(button => {

      button.disabled = true;

    });


  // ----------------------------------------------------------
  // 11-4. 顯示下一題按鈕
  // ----------------------------------------------------------

  if (questionIndex === QUESTIONS_PER_ROUND - 1) {

    $('next').textContent =
      '查看成績 🎉';

  } else {

    $('next').textContent =
      '下一題 →';

  }

  $('next').classList.remove('hidden');

}


// ============================================================
// 12. 下一題
// ============================================================

function advance() {

  // 必須先作答才能進入下一題
  if (!answered) return;

  // 尚未完成五題
  if (questionIndex < QUESTIONS_PER_ROUND - 1) {

    questionIndex++;

    showQuestion();

  }

  // 已完成五題
  else {

    showResult();

  }

}


// ============================================================
// 13. 顯示測驗成績
// ============================================================

function showResult() {

  // 隱藏題目
  $('question').classList.add('hidden');

  // 隱藏選項
  $('options').classList.add('hidden');

  // 隱藏下一題
  $('next').classList.add('hidden');

  // 清除回饋
  $('feedback').textContent = '';

  // 更新進度
  $('progress').textContent =
    '挑戰完成';

  // 進度條填滿
  $('progress-bar').style.width = '100%';

  // 顯示成績
  $('result').classList.remove('hidden');


  // ----------------------------------------------------------
  // 13-1. 計算成績
  // ----------------------------------------------------------

  const score =
    correctCount * POINTS_PER_QUESTION;

  // 判斷是否達到 60 分
  const passed =
    score >= PASS_SCORE;


  // ----------------------------------------------------------
  // 13-2. 顯示成績內容
  // ----------------------------------------------------------

  $('result-count').textContent =
    `答對題數：${correctCount} / ${QUESTIONS_PER_ROUND} 題`;

  $('result-score').textContent =
    `總成績：${score} 分`;


  // ----------------------------------------------------------
  // 13-3. 60 分以上
  // ----------------------------------------------------------

  if (passed) {

    $('result-emoji').textContent =
      '💖🎆';

    $('result-title').textContent =
      '太棒了！泰國旅遊達人！';

    $('result-message').textContent =
      '恭喜達成 60 分門檻！愛心煙火送給你 💗';

    // 啟動愛心煙火
    celebration = 'fireworks';

    // 立即產生第一波煙火
    spawnHeart(
      width * 0.5,
      height * 0.35
    );

    lastFireworkTime = millis();

  }


  // ----------------------------------------------------------
  // 13-4. 未達 60 分
  // ----------------------------------------------------------

  else {

    $('result-emoji').textContent =
      '💪🌈';

    $('result-title').textContent =
      '繼續加油，下次會更棒！';

    $('result-message').innerHTML =
      '<span class="cheer">加油！你一定可以！ 🌟</span>';

    // 啟動加油動畫
    celebration = 'cheer';

    // 記錄動畫開始時間
    cheerStart = millis();

  }

}


// ============================================================
// 14. 視窗大小改變時調整畫布
// ============================================================

function windowResized() {

  resizeCanvas(
    windowWidth,
    windowHeight
  );

}


// ============================================================
// 15. p5.js 動畫主迴圈
// ============================================================

function draw() {

  // 清除上一影格
  // 保持透明背景
  clear();


  // ----------------------------------------------------------
  // 15-1. 愛心煙火
  // ----------------------------------------------------------

  if (celebration === 'fireworks') {

    drawFireworks();

  }


  // ----------------------------------------------------------
  // 15-2. 加油動畫
  // ----------------------------------------------------------

  else if (celebration === 'cheer') {

    drawCheer();

  }

}


// ============================================================
// 16. 愛心煙火動畫
// ============================================================

function drawFireworks() {

  // 每隔約 600 毫秒產生一波煙火
  if (millis() - lastFireworkTime > 600) {

    // 隨機煙火位置
    const x = random(
      width * 0.15,
      width * 0.85
    );

    const y = random(
      height * 0.15,
      height * 0.75
    );

    spawnHeart(x, y);

    lastFireworkTime = millis();

  }


  // ----------------------------------------------------------
  // 更新所有煙火粒子
  // ----------------------------------------------------------

  for (let i = particles.length - 1; i >= 0; i--) {

    const p = particles[i];

    // 更新水平位置
    p.x += p.vx;

    // 更新垂直位置
    p.y += p.vy;

    // 模擬重力
    p.vy += 0.028;

    // 透明度逐漸降低
    p.life -= 2.2;

    // 不繪製外框
    noStroke();

    // 設定粒子顏色
    fill(
      p.color[0],
      p.color[1],
      p.color[2],
      Math.max(0, p.life)
    );

    // 繪製粒子
    circle(
      p.x,
      p.y,
      p.size
    );

    // 移除消失的粒子
    if (p.life <= 0) {

      particles.splice(i, 1);

    }

  }

}


// ============================================================
// 17. 產生愛心形狀煙火
// ============================================================

function spawnHeart(cx, cy) {

  // 愛心煙火顏色
  const palette = [

    [255, 120, 165],  // 粉紅
    [205, 180, 219],  // 淡紫
    [255, 175, 204],  // 淺粉
    [255, 210, 105]   // 金黃

  ];

  // 隨機選擇煙火顏色
  const color = random(palette);

  // 每次產生 90 個粒子
  const particleCount = 90;

  for (let i = 0; i < particleCount; i++) {

    // 計算愛心曲線角度
    const t =
      TWO_PI * i / particleCount;


    // --------------------------------------------------------
    // 愛心數學曲線
    // --------------------------------------------------------

    const heartX =
      16 * pow(sin(t), 3);

    const heartY =
      -(
        13 * cos(t)
        - 5 * cos(2 * t)
        - 2 * cos(3 * t)
        - cos(4 * t)
      );


    // --------------------------------------------------------
    // 隨機粒子速度
    // --------------------------------------------------------

    const speed = random(
      0.09,
      0.17
    );


    // --------------------------------------------------------
    // 建立煙火粒子
    // --------------------------------------------------------

    particles.push({

      // 初始位置
      x: cx,
      y: cy,

      // 水平速度
      vx: heartX * speed,

      // 垂直速度
      vy: heartY * speed,

      // 初始透明度
      life: 255,

      // 粒子大小
      size: random(2.5, 5.5),

      // 粒子顏色
      color: color

    });

  }

}


// ============================================================
// 18. 加油動畫
// ============================================================

function drawCheer() {

  push();

  // 使用 Google Fonts
  // 不再使用 Stick 字型
  textFont(QUIZ_FONT);

  // 粗體
  textStyle(BOLD);

  // 文字置中
  textAlign(CENTER, CENTER);


  // ----------------------------------------------------------
  // 18-1. 計算放大比例
  // ----------------------------------------------------------

  // 經過時間
  const elapsed =
    millis() - cheerStart;

  // 逐漸放大
  const scaleValue =
    1 + Math.min(
      elapsed / 6500,
      1.5
    );


  // ----------------------------------------------------------
  // 18-2. 響應式文字大小
  // ----------------------------------------------------------

  // 根據畫面寬度調整文字
  const baseSize = Math.min(
    width * 0.13,
    70
  );

  // 套用放大比例
  const finalSize =
    baseSize * scaleValue;

  textSize(finalSize);


  // ----------------------------------------------------------
  // 18-3. 設定文字顏色
  // ----------------------------------------------------------

  // 粉紅色、半透明
  fill(
    240,
    120,
    150,
    150
  );

  noStroke();


  // ----------------------------------------------------------
  // 18-4. 顯示加油文字
  // ----------------------------------------------------------

  text(
    '加油 ♥',
    width / 2,
    height * 0.16
  );

  pop();

}
