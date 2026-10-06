/* GAMBA ミニテスト：4択を4〜5問いっぺんに表示し、正解ごとに花吹雪が出ます。
   各単元のHTMLに次の2つを入れて使います。
     <script>window.MINITEST={items:[{q:"問題文",c:["選択肢1","選択肢2","選択肢3","選択肢4"],a:0,e:"解説"}, ...]};</script>
     <script src="minitest.js"></script>
   c の中で a 番目（0から数える）が正解です。表示のたびに選択肢の順番はシャッフルされます。 */
(function () {
  'use strict';
  var DATA = window.MINITEST;
  if (!DATA || !DATA.items || !DATA.items.length) return;

  /* ---------- スタイル ---------- */
  var css = [
    '#mt-open{background:#e0883a!important;box-shadow:0 3px 0 #a85d1c!important}',
    '#mt-overlay{display:none;position:fixed;inset:0;z-index:2000;background:rgba(30,20,10,.55);overflow-y:auto;-webkit-overflow-scrolling:touch}',
    '#mt-overlay.show{display:block}',
    '#mt-panel{position:relative;max-width:760px;margin:24px auto 40px;background:#fffdf8;border:3px solid #b23a2e;border-radius:14px;padding:16px 18px 20px;box-shadow:0 10px 36px rgba(0,0,0,.35);font-family:"BIZ UDPGothic","Meiryo",sans-serif;color:#222;line-height:1.8}',
    '#mt-panel h2{margin:0 0 4px;font-size:20px;border-left:6px solid #b23a2e;padding-left:10px}',
    '#mt-sub{font-size:13px;color:#666;margin:0 0 10px}',
    '#mt-close{position:absolute;top:8px;right:10px;background:#6c757d;color:#fff;border:none;border-radius:8px;padding:5px 12px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 0 #495057}',
    '.mt-q{background:#fff;border:1px solid #e0cfc9;border-radius:10px;padding:10px 12px;margin:10px 0}',
    '.mt-q.done-ok{border-color:#4caf50;background:#f3fbf3}',
    '.mt-q.done-ng{border-color:#e57373;background:#fff6f5}',
    '.mt-qt{font-weight:bold;font-size:15.5px;margin-bottom:6px}',
    '.mt-qt .no{display:inline-block;background:#b23a2e;color:#fff;border-radius:999px;min-width:1.9em;text-align:center;padding:0 6px;margin-right:6px;font-size:13px}',
    '.mt-ch{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.mt-c{display:block;width:100%;text-align:left;background:#fff;color:#222;border:2px solid #c9b8b2;border-radius:10px;padding:8px 10px;font-size:14.5px;line-height:1.55;font-weight:normal;cursor:pointer;box-shadow:none;position:relative;transition:transform .08s}',
    '.mt-c:hover:not(:disabled){border-color:#b23a2e;background:#fff4f2}',
    '.mt-c:active:not(:disabled){transform:scale(.98)}',
    '.mt-c .mk{display:inline-block;width:1.4em;font-weight:bold}',
    '.mt-c.ok{background:#e6f6e6;border-color:#43a047;color:#1b5e20;font-weight:bold}',
    '.mt-c.ng{background:#fde7e7;border-color:#e57373;color:#a33;text-decoration:line-through}',
    '.mt-c:disabled{cursor:default}',
    '.mt-exp{display:none;margin-top:8px;padding:8px 10px;border-left:5px solid #f2b705;background:#fffbe0;border-radius:6px;font-size:13.5px;line-height:1.75}',
    '.mt-exp.show{display:block}',
    '.mt-fb{min-height:1.4em;font-size:13px;font-weight:bold;margin-top:4px}',
    '.mt-fb.ok{color:#2e7d32}.mt-fb.ng{color:#c62828}',
    '#mt-result{display:none;text-align:center;margin-top:14px;padding:12px;border:2px solid #b23a2e;border-radius:12px;background:#fff4f2}',
    '#mt-result.show{display:block}',
    '#mt-result .score{font-size:26px;font-weight:bold;color:#b23a2e}',
    '#mt-result .btns{margin-top:8px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}',
    '#mt-result button{padding:9px 18px;border-radius:8px;border:none;background:#b23a2e;color:#fff;cursor:pointer;font-size:15px;font-weight:bold;box-shadow:0 3px 0 #7d2219}',
    '#mt-result button.secondary{background:#6c757d;box-shadow:0 3px 0 #495057}',
    '#mt-confetti{position:fixed;inset:0;width:100%;height:100%;z-index:3000;pointer-events:none}',
    '@media(max-width:600px){#mt-panel{margin:10px 8px 30px;padding:14px 12px 18px}.mt-ch{grid-template-columns:1fr}}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- 花吹雪 ---------- */
  var canvas = null, ctx = null, petals = [], raf = 0;
  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var COLORS = ['#f8b4c4', '#f48fb1', '#ffd54f', '#ffb74d', '#ef9a9a', '#fff176', '#ffffff', '#ce93d8'];

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'mt-confetti';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!canvas) return;
    var d = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * d);
    canvas.height = Math.floor(window.innerHeight * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function burst(x, y, n, spread, rain) {
    if (reduce) n = Math.ceil(n / 3);
    ensureCanvas();
    for (var i = 0; i < n; i++) {
      var ang = rain ? (Math.PI / 2 + (Math.random() - 0.5) * 0.6) : (-Math.PI / 2 + (Math.random() - 0.5) * spread);
      var sp = rain ? 1.5 + Math.random() * 2.5 : 5 + Math.random() * 8;
      petals.push({
        x: rain ? Math.random() * window.innerWidth : x,
        y: rain ? -20 - Math.random() * 200 : y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        w: 7 + Math.random() * 7,
        h: 4 + Math.random() * 5,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3,
        sw: Math.random() * 6.28,
        vs: 0.04 + Math.random() * 0.06,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var H = window.innerHeight, alive = [];
    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];
      p.life++;
      p.vy += 0.16;
      p.vx *= 0.985;
      if (p.vy > 3) p.vy = 3;
      p.sw += p.vs;
      p.x += p.vx + Math.sin(p.sw) * 0.9;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y < H + 30 && p.life < 400) {
        alive.push(p);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = p.life > 330 ? Math.max(0, (400 - p.life) / 70) : 0.95;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w / 2, p.h / 2 * (0.5 + Math.abs(Math.sin(p.sw))), 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }
    }
    petals = alive;
    if (petals.length) { raf = requestAnimationFrame(tick); }
    else { raf = 0; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }
  function bigBurst() {
    var w = window.innerWidth, h = window.innerHeight;
    burst(w * 0.2, h * 0.7, 40, 1.6);
    burst(w * 0.8, h * 0.7, 40, 1.6);
    burst(w * 0.5, h * 0.6, 50, 2.2);
    burst(0, 0, reduce ? 20 : 90, 0, true);
  }

  /* ---------- 画面の組み立て ---------- */
  var overlay, panel, listEl, resultEl, state = [];

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'mt-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'ミニテスト');
    overlay.innerHTML =
      '<div id="mt-panel">' +
      '<button id="mt-close" type="button">✕ 閉じる</button>' +
      '<h2>🌸 ミニテスト</h2>' +
      '<p id="mt-sub">' + esc(DATA.title || 'この単元のまとめです') + '。答えを選んでみましょう（' + DATA.items.length + '問・正解すると花びらが舞います）。</p>' +
      '<div id="mt-list"></div>' +
      '<div id="mt-result" aria-live="polite"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    panel = overlay.querySelector('#mt-panel');
    listEl = overlay.querySelector('#mt-list');
    resultEl = overlay.querySelector('#mt-result');
    overlay.querySelector('#mt-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('show')) close();
    });
  }

  function render() {
    listEl.innerHTML = '';
    resultEl.className = '';
    resultEl.innerHTML = '';
    state = DATA.items.map(function (it) {
      var order = shuffle(it.c.map(function (_, i) { return i; }));
      return { order: order, tries: 0, done: false, ok: false };
    });
    DATA.items.forEach(function (it, qi) {
      var s = state[qi];
      var box = document.createElement('div');
      box.className = 'mt-q';
      box.id = 'mt-q' + qi;
      var html = '<div class="mt-qt"><span class="no">' + (qi + 1) + '</span>' + esc(it.q) + '</div><div class="mt-ch">';
      s.order.forEach(function (oi, pos) {
        html += '<button type="button" class="mt-c" data-q="' + qi + '" data-o="' + oi + '"><span class="mk">' + 'ア イ ウ エ オ'.split(' ')[pos] + '</span>' + esc(it.c[oi]) + '</button>';
      });
      html += '</div><div class="mt-fb" aria-live="polite"></div><div class="mt-exp">' + esc(it.e || '') + '</div>';
      box.innerHTML = html;
      listEl.appendChild(box);
    });
    listEl.querySelectorAll('.mt-c').forEach(function (b) {
      b.addEventListener('click', onPick);
    });
  }

  function onPick(e) {
    var btn = e.currentTarget;
    var qi = +btn.getAttribute('data-q'), oi = +btn.getAttribute('data-o');
    var s = state[qi], it = DATA.items[qi];
    if (s.done) return;
    var box = document.getElementById('mt-q' + qi);
    var fb = box.querySelector('.mt-fb');
    var exp = box.querySelector('.mt-exp');
    if (oi === it.a) {
      s.done = true; s.ok = true;
      btn.classList.add('ok');
      box.classList.add('done-ok');
      fb.className = 'mt-fb ok';
      fb.textContent = '⭕ 正解！';
      exp.classList.add('show');
      lock(box);
      var r = btn.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 34, 2.4);
    } else {
      s.tries++;
      btn.classList.add('ng');
      btn.disabled = true;
      if (s.tries >= 2) {
        s.done = true; s.ok = false;
        box.classList.add('done-ng');
        fb.className = 'mt-fb ng';
        fb.textContent = '❌ 正しい答えは下のとおりです。';
        box.querySelectorAll('.mt-c').forEach(function (b) {
          if (+b.getAttribute('data-o') === it.a) b.classList.add('ok');
        });
        exp.classList.add('show');
        lock(box);
      } else {
        fb.className = 'mt-fb ng';
        fb.textContent = 'おしい！もう一度えらんでみましょう。';
      }
    }
    checkFinish();
  }

  function lock(box) {
    box.querySelectorAll('.mt-c').forEach(function (b) { b.disabled = true; });
  }

  function checkFinish() {
    if (!state.every(function (s) { return s.done; })) return;
    var n = state.filter(function (s) { return s.ok; }).length, t = state.length;
    var all = n === t;
    resultEl.className = 'show';
    resultEl.innerHTML =
      '<div class="score">' + n + ' / ' + t + ' 問 正解</div>' +
      '<div>' + (all ? '🎉 全問正解！すばらしい！確認問題に進みましょう。' : (n >= Math.ceil(t * 0.6) ? 'よくできました。まちがえた問題は、解説をもう一度読みましょう。' : '解説を読んで、もう一度挑戦してみましょう。')) + '</div>' +
      '<div class="btns"><button type="button" id="mt-retry">もう一度やる</button><button type="button" class="secondary" id="mt-done">閉じる</button></div>';
    resultEl.querySelector('#mt-retry').addEventListener('click', function () { render(); panel.scrollIntoView({ block: 'start' }); overlay.scrollTop = 0; });
    resultEl.querySelector('#mt-done').addEventListener('click', close);
    if (all) { setTimeout(bigBurst, 250); }
    setTimeout(function () { try { resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {} }, 350);
  }

  function open() {
    if (!overlay) build();
    render();
    overlay.classList.add('show');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }
  function close() {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  /* ---------- ボタンを下のバーに追加 ---------- */
  function addButton() {
    var host = document.querySelector('.controls');
    if (!host) return;
    var b = document.createElement('button');
    b.id = 'mt-open';
    b.type = 'button';
    b.textContent = '🌸 ミニテスト';
    b.addEventListener('click', open);
    var next = document.getElementById('next-btn');
    if (next) host.insertBefore(b, next); else host.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton);
  else addButton();
})();
