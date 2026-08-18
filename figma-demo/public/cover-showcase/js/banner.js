(() => {
  const DATA_URL = './data/editions.json?v=2';
  const BOARD = { w: 800, h: 2000 };
  const TITLE = '我的币安人生';

  const ROW_LAYOUT = {
    back: { cy: 1120, radiusX: 360, radiusY: 88, spread: 104, scale: 0.66 },
    mid: { cy: 1218, radiusX: 322, radiusY: 74, spread: 86, scale: 0.86 },
    front: { cy: 1328, radiusX: 270, radiusY: 60, spread: 64, scale: 1.08 },
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  async function init() {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('Failed to load editions');
    const data = await res.json();
    $('#app').innerHTML = render(data);
    layoutFans(data);
    fitBoard();
    bind(data);
    window.addEventListener('resize', fitBoard);
  }

  function render(data) {
    const meta = data.meta || {};
    const count = (data.rows || []).reduce((n, r) => n + (r.editions || []).length, 0);
    return `
      <div class="chrome">
        <div class="chrome-left">
          <span class="chrome-brand">Cover Fan</span>
          <span class="chrome-note">易拉宝 80×200 · ${count} 本 3D 书</span>
        </div>
        <div class="chrome-right">
          <a class="chrome-link" href="/club/chronicle" target="_blank" rel="noopener">打开活动</a>
          <button type="button" class="chrome-btn" id="captureBtn">隐藏工具条截图</button>
          <button type="button" class="chrome-btn gold" id="pngBtn">下载 PNG</button>
        </div>
      </div>
      <div class="stage" id="stage">
        <div class="artboard" id="artboard">
          <header class="mast">
            <p class="mast-kicker">${esc(meta.kicker || '')}</p>
            <h1 class="mast-title">${esc(meta.title || TITLE)}</h1>
            <p class="mast-en">${esc(meta.titleEn || '')}</p>
            <p class="mast-lead">${esc(meta.lead || '')}</p>
          </header>
          <div class="fan" id="fan"></div>
          <footer class="foot">
            <div class="foot-cta">${esc(meta.cta || '')}</div>
            <p class="foot-count">${esc(meta.countLabel || `${count} 种封面组合`)}</p>
            <p class="foot-pub">${esc(meta.publisher || '')}</p>
            <img class="sig" src="/partner-deck/assets/cz-signature-gold.png" alt="" />
          </footer>
        </div>
      </div>
    `;
  }

  function renderBook(ed) {
    const dark = ed.dark ? ' is-light' : '';
    return `
      <div class="book3d" data-row="${esc(ed.row)}" data-i="${ed.i}">
        <div class="book3d-shell">
          <div class="book3d-spine" aria-hidden>
            <span class="book3d-spine-title">${esc(TITLE)}</span>
            <span class="book3d-spine-by">${esc(ed.name || '')}</span>
          </div>
          <div class="book3d-edge" aria-hidden></div>
          <div class="book3d-top" aria-hidden></div>
          <div class="book3d-bottom" aria-hidden></div>
          <div class="book3d-front">
            <img class="book3d-art" src="${esc(ed.src)}" alt="${esc(ed.name)} · ${esc(ed.role)}" />
            <div class="book3d-hinge"></div>
            <div class="book3d-sheen"></div>
            <p class="book3d-corner">${esc(ed.role || '')}</p>
            <div class="book3d-meta">
              <h3>${esc(TITLE)}</h3>
              <p class="book3d-by${dark}">${esc(ed.name || '')}</p>
              <p class="book3d-kw${dark}">${esc(ed.keywords || '')}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function layoutFans(data) {
    const fan = $('#fan');
    const placed = [];
    (data.rows || []).forEach((row) => {
      const layout = ROW_LAYOUT[row.id] || ROW_LAYOUT.mid;
      const list = row.editions || [];
      const n = list.length;
      list.forEach((ed, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const deg = -layout.spread / 2 + t * layout.spread;
        const rad = (deg * Math.PI) / 180;
        const stagger = Math.sin(t * Math.PI) * -14 + ((i % 2) * 28 - 14);
        placed.push({
          ...ed,
          row: row.id,
          i,
          x: BOARD.w / 2 + Math.sin(rad) * layout.radiusX,
          y: layout.cy - Math.cos(rad) * layout.radiusY + stagger,
          rotateZ: deg * 0.9,
          rotateY: 18 + Math.abs(t - 0.5) * 20,
          scale: layout.scale * (0.96 + (1 - Math.abs(t - 0.5) * 2) * 0.08),
          z: (row.id === 'front' ? 300 : row.id === 'mid' ? 200 : 100)
            + Math.round((1 - Math.abs(t - 0.5) * 2) * 40),
        });
      });
    });

    fan.innerHTML = placed.map(renderBook).join('');
    placed.forEach((ed) => {
      const el = fan.querySelector(`.book3d[data-row="${ed.row}"][data-i="${ed.i}"]`);
      if (!el) return;
      const bw = 168 * ed.scale;
      const bh = 224 * ed.scale;
      el.style.setProperty('--bw', `${bw}px`);
      el.style.setProperty('--bh', `${bh}px`);
      el.style.setProperty('--bt', `${Math.max(22, 38 * ed.scale)}px`);
      el.style.width = `${bw}px`;
      el.style.height = `${bh}px`;
      el.style.zIndex = String(ed.z);
      el.style.transform = `translate(${ed.x - bw / 2}px, ${ed.y - bh / 2}px) rotate(${ed.rotateZ}deg)`;
      const shell = el.querySelector('.book3d-shell');
      if (shell) shell.style.transform = `rotateX(8deg) rotateY(${ed.rotateY}deg)`;
    });
  }

  function fitBoard() {
    const stage = $('#stage');
    const board = $('#artboard');
    if (!stage || !board) return;
    const padX = 24;
    const padY = 88;
    const sx = (stage.clientWidth - padX) / BOARD.w;
    const sy = (stage.clientHeight - padY) / BOARD.h;
    const s = Math.max(0.22, Math.min(sx, sy, 1));
    board.style.transform = `scale(${s})`;
    board.style.transformOrigin = 'center center';
  }

  function bind() {
    $('#captureBtn')?.addEventListener('click', () => {
      document.body.classList.add('is-capture');
      alert('工具条已隐藏。截完图后按 Esc 或点页面空白处可恢复。');
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.body.classList.remove('is-capture');
    });
    $('#stage')?.addEventListener('click', (e) => {
      if (e.target.id === 'stage') document.body.classList.remove('is-capture');
    });
    $('#pngBtn')?.addEventListener('click', () => {
      downloadPng().catch((err) => {
        console.error(err);
        alert('PNG 导出失败，请改用「隐藏工具条截图」。');
      });
    });
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-lib-src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === '1') {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.dataset.libSrc = src;
      s.onload = () => {
        s.dataset.loaded = '1';
        resolve();
      };
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  async function downloadPng() {
    const btn = $('#pngBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '导出中…';
    }
    document.body.classList.add('is-capture');
    try {
      if (!window.html2canvas) {
        await loadScriptOnce('/partner-deck/assets/vendor/html2canvas.min.js');
      }
      const board = $('#artboard');
      const canvas = await window.html2canvas(board, {
        backgroundColor: '#1a1714',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: BOARD.w,
        height: BOARD.h,
        windowWidth: BOARD.w,
        windowHeight: BOARD.h,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'my-binance-life-cover-fan-80x200.png';
      a.click();
    } finally {
      document.body.classList.remove('is-capture');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '下载 PNG';
      }
    }
  }

  init().catch((err) => {
    console.error(err);
    $('#app').innerHTML = '<div class="boot">封面加载失败，请刷新重试。</div>';
  });
})();
